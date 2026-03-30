import { useState, useEffect, useRef, useCallback } from 'react';
import { useBackHandler } from '@/hooks/useBackHandler';
import { searchProducts, getProductByBarcode, isProductVegan, findVeganAlternatives } from '@/lib/openfoodfacts';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { CustomFoodModal } from './CustomFoodModal';
import { Spinner } from '@/components/ui/Spinner';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Search, ScanBarcode, X, Leaf, Plus, Clock, ChevronDown, ChevronUp, AlertCircle, Star } from 'lucide-react';
import type { OpenFoodFactsProduct, MealType, RecentFood, CustomFood } from '@/types';

const MEAL_OPTIONS: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { value: 'lunch', label: 'Comida', icon: '☀️' },
  { value: 'dinner', label: 'Cena', icon: '🌙' },
  { value: 'snack', label: 'Snacks', icon: '🍎' },
];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snacks',
};

// Timeout for add operation (15 seconds)
const ADD_TIMEOUT = 15000;

export function SearchPage() {
  const { user } = useAuthStore();
  const { addEntry, selectedDate, recentFoods, fetchRecentFoods } = useDiaryStore();
  const { searchCustomFoods } = useCustomFoodStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [customResults, setCustomResults] = useState<CustomFood[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [servingInput, setServingInput] = useState('100'); // String for input flexibility
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [lockedMealType, setLockedMealType] = useState<MealType | null>(null); // When coming from diary
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [showAllRecents, setShowAllRecents] = useState(false);
  const [showCustomFoodModal, setShowCustomFoodModal] = useState(false);
  const [alternatives, setAlternatives] = useState<OpenFoodFactsProduct[]>([]);
  const [debouncePending, setDebouncePending] = useState(false);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const scannerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const servingGrams = Math.max(1, parseInt(servingInput) || 0);

  // Load recent foods on mount
  useEffect(() => {
    if (user) fetchRecentFoods(user.id);
  }, [user?.id]);

  // Listen for meal type from diary page (locked — no selector shown)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail) {
        setMealType(e.detail);
        setLockedMealType(e.detail);
      }
    };
    window.addEventListener('navigate-search', handler as any);
    return () => window.removeEventListener('navigate-search', handler as any);
  }, []);

  // Reset locked meal type when going back to search list
  const clearProduct = () => {
    setSelectedProduct(null);
    setAddError(null);
  };

  // Intercept Android/iOS system back when product detail is open
  useBackHandler(selectedProduct !== null, clearProduct);

  // Fetch vegan alternatives when a non-vegan product is selected
  useEffect(() => {
    setAlternatives([]);
    if (!selectedProduct) return;
    if (isProductVegan(selectedProduct)) return;

    let cancelled = false;
    setLoadingAlternatives(true);
    findVeganAlternatives(selectedProduct).then((results) => {
      if (cancelled) return;
      setAlternatives(results);
      setLoadingAlternatives(false);
    });

    return () => { cancelled = true; };
  }, [selectedProduct?.code]);

  // Debounced search — custom foods instantly, OpenFoodFacts after 300ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedProduct) {
      setDebouncePending(false);
      return;
    }
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setCustomResults([]);
      setDebouncePending(false);
      return;
    }

    // Instant: search custom foods locally
    const localResults = searchCustomFoods(query);
    setCustomResults(veganOnly ? localResults.filter((f) => f.is_vegan) : localResults);

    // Show pending indicator immediately while debounce waits
    setDebouncePending(true);

    // Debounced: search OpenFoodFacts API
    debounceRef.current = setTimeout(async () => {
      setDebouncePending(false);
      setSearching(true);
      const res = await searchProducts(query, 1, veganOnly);
      setResults(res.products);
      setSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      setDebouncePending(false);
    };
  }, [query, veganOnly, selectedProduct]);

  const startScanner = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    try {
      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import('html5-qrcode');

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODE_128,
      ];

      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);

      const boxRatio = 0.85;
      // iOS Safari is less stable at high FPS; 10 is a reliable sweet spot.
      const scanFps = isIOS ? 10 : 6;

      const qrbox = (vw: number, vh: number) => ({
        width: Math.floor(vw * boxRatio),
        height: Math.floor(Math.min(vw * boxRatio * 0.55, vh * 0.5)),
      });
      // Both platforms benefit from a defined scanning box for 1D barcode reliability.
      const scannerConfig = { fps: scanFps, qrbox, disableFlip: true };

      // Creates a fresh Html5Qrcode instance with a clean DOM container.
      // A new instance is required after each failed start() — reusing a
      // partially-initialised instance causes silent failures, especially on iOS.
      const createScanner = () => {
        const container = document.getElementById('scanner-container');
        if (container) container.innerHTML = '';
        return new Html5Qrcode('scanner-container', { formatsToSupport, verbose: false });
      };

      // After scanner starts, request continuous autofocus.
      // Zoom is intentionally kept conservative (1.5×) — higher values can
      // shift focus distance and make thin barcode lines harder to resolve.
      const applyAdvancedConstraints = async () => {
        try {
          const videoEl = document.querySelector('#scanner-container video') as HTMLVideoElement | null;
          if (!videoEl) return;
          const stream = videoEl.srcObject as MediaStream | null;
          const track = stream?.getVideoTracks()[0];
          if (!track) return;
          const capabilities = (track as any).getCapabilities?.();
          if (!capabilities) return;
          const advanced: Record<string, unknown> = {};
          if (capabilities.focusMode?.includes('continuous')) {
            advanced.focusMode = 'continuous';
          }
          if (capabilities.zoom && isIOS) {
            const minZoom = capabilities.zoom.min ?? 1;
            const maxZoom = capabilities.zoom.max ?? minZoom;
            // 1.5× avoids the ultra-wide lens while keeping a usable focus range.
            const preferredZoom = Math.min(maxZoom, Math.max(minZoom, 1.5));
            if (preferredZoom > minZoom) {
              advanced.zoom = preferredZoom;
            }
          }
          if (Object.keys(advanced).length > 0) {
            await track.applyConstraints({ advanced: [advanced] } as any);
          }
        } catch (e) {
          // Non-critical — some browsers don't support advanced constraints
          console.warn('Could not apply advanced camera constraints:', e);
        }
      };

      // onScanSuccess captures the current scanner via closure after each attempt.
      let activeScanner: InstanceType<typeof Html5Qrcode> | null = null;
      const onScanSuccess = async (decodedText: string) => {
        try { await activeScanner?.stop(); } catch {}
        setScanning(false);
        setSearching(true);
        const product = await getProductByBarcode(decodedText);
        if (product) {
          setSelectedProduct(product);
          setServingInput(String(product.serving_quantity || 100));
        } else {
          setResults([]);
          setQuery(`Código: ${decodedText} (no encontrado)`);
        }
        setSearching(false);
      };

      // iOS Safari rejects the exact facingMode constraint far more often than
      // Android Chrome — start with `ideal` on iOS to avoid a guaranteed first
      // failure that leaves the instance in a bad internal state.
      const cameraConstraints = isIOS
        ? [
            { facingMode: { ideal: 'environment' } },
            { facingMode: 'environment' },
          ]
        : [
            { facingMode: 'environment' },
            { facingMode: { ideal: 'environment' } },
          ];

      let lastErr: unknown;
      for (const constraint of cameraConstraints) {
        const scanner = createScanner();
        activeScanner = scanner;
        scannerRef.current = scanner;
        try {
          await scanner.start(constraint, scannerConfig, onScanSuccess, () => {});
          await applyAdvancedConstraints();
          return;
        } catch (err) {
          console.warn('Scanner start attempt failed:', err);
          lastErr = err;
          try { await scanner.stop(); } catch {}
          try { (scanner as any).clear?.(); } catch {}
          activeScanner = null;
          scannerRef.current = null;
        }
      }

      // Final fallback: pick a camera by device ID
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        const backCam = devices.find(d => d.label.toLowerCase().includes('back'))
          || devices[devices.length - 1];
        const scanner = createScanner();
        activeScanner = scanner;
        scannerRef.current = scanner;
        await scanner.start(backCam.id, scannerConfig, onScanSuccess, () => {});
        await applyAdvancedConstraints();
        return;
      }

      throw lastErr ?? new Error('No cameras available');
    } catch (err: unknown) {
      console.error('Scanner error:', err);
      setScanning(false);
      const name = (err as any)?.name ?? '';
      const msg = (err as any)?.message ?? '';
      if (name === 'NotAllowedError' || msg.toLowerCase().includes('permission')) {
        setScanError('Permiso de cámara denegado. Actívalo en los ajustes del navegador.');
      } else if (name === 'NotFoundError' || msg.includes('No cameras')) {
        setScanError('No se encontró cámara en este dispositivo.');
      } else if (name === 'OverconstrainedError') {
        setScanError('La cámara no soporta la configuración solicitada. Inténtalo de nuevo.');
      } else {
        setScanError('No se pudo iniciar la cámara. Comprueba los permisos e inténtalo de nuevo.');
      }
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch {}
    }
    setScanning(false);
  }, []);

  // Stop scanner when app goes to background; reset stuck adding state on resume
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        stopScanner();
      } else if (document.visibilityState === 'visible' && adding) {
        setAdding(false);
        setAddError('La operación fue interrumpida. Inténtalo de nuevo.');
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [adding, stopScanner]);

  // Stop scanner on unmount
  useEffect(() => {
    return () => { stopScanner(); };
  }, [stopScanner]);

  const handleAddFood = async () => {
    if (!selectedProduct || !user || adding) return;
    if (servingGrams <= 0) {
      setAddError('Introduce una cantidad válida en gramos');
      return;
    }

    setAdding(true);
    setAddError(null);

    const n = selectedProduct.nutriments;
    const ratio = servingGrams / 100;

    // Add with timeout
    const timeoutPromise = new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: 'La operación tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.' }), ADD_TIMEOUT)
    );

    const addPromise = addEntry({
      user_id: user.id,
      date: selectedDate,
      meal_type: mealType,
      food_name: selectedProduct.product_name,
      barcode: selectedProduct.code || null,
      brand: selectedProduct.brands || null,
      serving_size_g: servingGrams,
      calories: Math.round(n['energy-kcal_100g'] * ratio),
      protein_g: Math.round(n.proteins_100g * ratio * 10) / 10,
      carbs_g: Math.round(n.carbohydrates_100g * ratio * 10) / 10,
      fat_g: Math.round(n.fat_100g * ratio * 10) / 10,
      fiber_g: Math.round(n.fiber_100g * ratio * 10) / 10,
      sugar_g: Math.round(n.sugars_100g * ratio * 10) / 10,
      saturated_fat_g: Math.round(n['saturated-fat_100g'] * ratio * 10) / 10,
      sodium_mg: Math.round(n.sodium_100g * ratio * 1000),
      // Micros — OFF stores all values in grams; convert to target units
      vitamin_b12_mcg: Math.round((n['vitamin-b12_100g'] || 0) * ratio * 1e6 * 100) / 100,
      iron_mg: Math.round((n['iron_100g'] || 0) * ratio * 1000 * 10) / 10,
      zinc_mg: Math.round((n['zinc_100g'] || 0) * ratio * 1000 * 10) / 10,
      calcium_mg: Math.round((n['calcium_100g'] || 0) * ratio * 1000 * 10) / 10,
      omega3_g: 0,
      vitamin_d_mcg: Math.round((n['vitamin-d_100g'] || 0) * ratio * 1e6 * 100) / 100,
      is_vegan: isProductVegan(selectedProduct),
      image_url: selectedProduct.image_front_url || null,
    });

    const result = await Promise.race([addPromise, timeoutPromise]);

    setAdding(false);
    if (result.error) {
      setAddError(result.error);
    } else {
      setSelectedProduct(null);
      setLockedMealType(null);
      setAddError(null);
      fetchRecentFoods(user.id);
      window.dispatchEvent(new CustomEvent('navigate-diary', {
        detail: { message: `${selectedProduct.product_name} añadido a ${MEAL_LABELS[mealType]}` }
      }));
    }
  };

  // Quick add from recent foods
  const handleQuickAdd = async (food: RecentFood) => {
    if (!user) return;
    const ratio = food.last_serving_g / 100;

    const { error } = await addEntry({
      user_id: user.id,
      date: selectedDate,
      meal_type: mealType,
      food_name: food.food_name,
      barcode: food.barcode,
      brand: food.brand,
      serving_size_g: food.last_serving_g,
      calories: Math.round(food.calories_per_100g * ratio),
      protein_g: Math.round(food.protein_per_100g * ratio * 10) / 10,
      carbs_g: Math.round(food.carbs_per_100g * ratio * 10) / 10,
      fat_g: Math.round(food.fat_per_100g * ratio * 10) / 10,
      fiber_g: Math.round(food.fiber_per_100g * ratio * 10) / 10,
      sugar_g: Math.round(food.sugar_per_100g * ratio * 10) / 10,
      saturated_fat_g: Math.round(food.saturated_fat_per_100g * ratio * 10) / 10,
      sodium_mg: Math.round(food.sodium_per_100g * ratio * 10),
      vitamin_b12_mcg: Math.round((food.vitamin_b12_mcg_per_100g || 0) * ratio * 100) / 100,
      iron_mg: Math.round((food.iron_mg_per_100g || 0) * ratio * 10) / 10,
      zinc_mg: Math.round((food.zinc_mg_per_100g || 0) * ratio * 10) / 10,
      calcium_mg: Math.round((food.calcium_mg_per_100g || 0) * ratio * 10) / 10,
      omega3_g: Math.round((food.omega3_g_per_100g || 0) * ratio * 1000) / 1000,
      vitamin_d_mcg: Math.round((food.vitamin_d_mcg_per_100g || 0) * ratio * 100) / 100,
      is_vegan: food.is_vegan,
      image_url: food.image_url,
    });

    if (!error) {
      window.dispatchEvent(new CustomEvent('navigate-diary', {
        detail: { message: `${food.food_name} añadido a ${MEAL_LABELS[mealType]}` }
      }));
    }
  };

  // Convert RecentFood to product for detail view
  const openRecentDetail = (food: RecentFood) => {
    setSelectedProduct({
      code: food.barcode || '',
      product_name: food.food_name,
      brands: food.brand || '',
      image_front_url: food.image_url || '',
      categories_tags: [],
      labels_tags: food.is_vegan ? ['en:vegan'] : [],
      nutriments: {
        'energy-kcal_100g': food.calories_per_100g,
        proteins_100g: food.protein_per_100g,
        carbohydrates_100g: food.carbs_per_100g,
        fat_100g: food.fat_per_100g,
        fiber_100g: food.fiber_per_100g,
        sugars_100g: food.sugar_per_100g,
        'saturated-fat_100g': food.saturated_fat_per_100g,
        sodium_100g: food.sodium_per_100g / 1000,
        // Micros — stored in target units per 100g, convert back to grams for OFF format
        'vitamin-b12_100g': (food.vitamin_b12_mcg_per_100g || 0) / 1e6,
        'iron_100g': (food.iron_mg_per_100g || 0) / 1000,
        'zinc_100g': (food.zinc_mg_per_100g || 0) / 1000,
        'calcium_100g': (food.calcium_mg_per_100g || 0) / 1000,
        'vitamin-d_100g': (food.vitamin_d_mcg_per_100g || 0) / 1e6,
      },
      serving_size: `${food.last_serving_g}g`,
      serving_quantity: food.last_serving_g,
    });
    setServingInput(String(food.last_serving_g));
  };

  // Convert CustomFood to product for detail view
  const openCustomFoodDetail = (food: CustomFood) => {
    setSelectedProduct({
      code: '',
      product_name: food.name,
      brands: food.brand || '',
      image_front_url: food.image_url || '',
      categories_tags: [],
      labels_tags: food.is_vegan ? ['en:vegan'] : [],
      nutriments: {
        'energy-kcal_100g': food.calories_per_100g,
        proteins_100g: food.protein_per_100g,
        carbohydrates_100g: food.carbs_per_100g,
        fat_100g: food.fat_per_100g,
        fiber_100g: food.fiber_per_100g,
        sugars_100g: 0,
        'saturated-fat_100g': 0,
        sodium_100g: 0,
      },
      serving_size: '100g',
      serving_quantity: 100,
    });
    setServingInput('100');
  };

  // ==================== PRODUCT DETAIL VIEW ====================
  if (selectedProduct) {
    const n = selectedProduct.nutriments;
    const ratio = servingGrams / 100;
    const vegan = isProductVegan(selectedProduct);

    return (
      <div className="pb-28 px-4 pt-6">
        <button onClick={clearProduct} aria-label="Volver a búsqueda" className="flex items-center gap-1 text-sm text-surface-500 mb-4 hover:text-surface-700">
          <X className="w-4 h-4" /> Volver a búsqueda
        </button>

        <div className="card overflow-hidden">
          {selectedProduct.image_front_url && (
            <img src={selectedProduct.image_front_url} alt="" className="w-full h-48 object-contain bg-surface-50 p-4" />
          )}
          <div className="p-4 space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl font-bold">{selectedProduct.product_name}</h2>
                {vegan && (
                  <span className="inline-flex items-center gap-1 bg-brand-100 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <Leaf className="w-3 h-3" /> Vegano
                  </span>
                )}
              </div>
              {selectedProduct.brands && (
                <p className="text-sm text-surface-500">{selectedProduct.brands}</p>
              )}
            </div>

            {/* Serving selector — allows empty input for typing */}
            <div>
              <label className="label">Cantidad (gramos)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={servingInput}
                  onChange={(e) => setServingInput(e.target.value)}
                  onBlur={() => {
                    if (!servingInput || parseInt(servingInput) <= 0) {
                      setServingInput('100');
                    }
                  }}
                  className="input flex-1 font-mono"
                  inputMode="numeric"
                />
                {selectedProduct.serving_quantity > 0 && (
                  <button
                    onClick={() => setServingInput(String(selectedProduct.serving_quantity))}
                    className="btn-secondary text-xs whitespace-nowrap"
                  >
                    1 porción ({selectedProduct.serving_quantity}g)
                  </button>
                )}
              </div>
              {/* Quick gram buttons */}
              <div className="flex gap-2 mt-2">
                {[50, 100, 150, 200].map((g) => (
                  <button
                    key={g}
                    onClick={() => setServingInput(String(g))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      servingGrams === g
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-surface-200 text-surface-500 hover:border-surface-300'
                    }`}
                  >
                    {g}g
                  </button>
                ))}
              </div>
            </div>

            {/* Nutrients */}
            <div className="bg-surface-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Calorías</span>
                <span className="font-mono">{servingGrams > 0 ? Math.round(n['energy-kcal_100g'] * ratio) : 0} kcal</span>
              </div>
              <div className="h-px bg-surface-200" />
              {[
                { label: 'Proteínas', val: n.proteins_100g, color: 'text-blue-600' },
                { label: 'Carbohidratos', val: n.carbohydrates_100g, color: 'text-amber-600' },
                { label: '  de los cuales azúcares', val: n.sugars_100g, color: 'text-amber-400', indent: true },
                { label: 'Grasas', val: n.fat_100g, color: 'text-rose-600' },
                { label: '  de las cuales saturadas', val: n['saturated-fat_100g'], color: 'text-rose-400', indent: true },
                { label: 'Fibra', val: n.fiber_100g, color: 'text-green-600' },
              ].map((item) => (
                <div key={item.label} className={`flex justify-between text-sm ${item.indent ? 'pl-3 text-surface-500' : ''}`}>
                  <span>{item.label}</span>
                  <span className={`font-mono ${item.color}`}>{servingGrams > 0 ? (item.val * ratio).toFixed(1) : '0.0'}g</span>
                </div>
              ))}
            </div>

            {/* Vegan alternatives (only for non-vegan products with categories) */}
            {!vegan && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Leaf className="w-4 h-4 text-brand-500" />
                  <h3 className="text-sm font-semibold text-surface-700">Alternativas veganas</h3>
                </div>

                {loadingAlternatives && (
                  <div className="flex gap-3 overflow-hidden">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="min-w-[160px] h-[140px] rounded-2xl bg-surface-100 animate-pulse" />
                    ))}
                  </div>
                )}

                {!loadingAlternatives && alternatives.length === 0 && (
                  <p className="text-xs text-surface-400 py-3">
                    No se encontraron alternativas veganas en esta categoría
                  </p>
                )}

                {!loadingAlternatives && alternatives.length > 0 && (
                  <div className="flex gap-3 overflow-x-auto no-scrollbar snap-x snap-mandatory -mx-4 px-4 pb-1">
                    {alternatives.slice(0, 3).map((alt) => (
                      <button
                        key={alt.code}
                        onClick={() => {
                          setSelectedProduct(alt);
                          setServingInput(String(alt.serving_quantity || 100));
                        }}
                        className="min-w-[160px] max-w-[160px] snap-start rounded-2xl border border-brand-200 bg-brand-50/30 p-3 text-left flex flex-col gap-2 hover:border-brand-400 transition-colors flex-shrink-0"
                      >
                        {alt.image_front_url ? (
                          <img src={alt.image_front_url} alt="" className="w-full h-20 object-contain rounded-xl bg-white" />
                        ) : (
                          <div className="w-full h-20 rounded-xl bg-brand-50 flex items-center justify-center">
                            <Leaf className="w-6 h-6 text-brand-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-surface-800 truncate">{alt.product_name}</p>
                          <p className="text-[10px] text-surface-400 truncate">{alt.brands || 'Sin marca'}</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-surface-700">
                            {Math.round(alt.nutriments['energy-kcal_100g'])} <span className="text-[10px] font-normal text-surface-400">kcal</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 bg-brand-100 text-brand-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                            <Leaf className="w-2.5 h-2.5" /> Vegano
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Meal selector — ONLY shown when NOT coming from diary (no lockedMealType) */}
            {lockedMealType ? (
              <div className="bg-surface-50 rounded-2xl px-4 py-3 flex items-center gap-2">
                <span className="text-sm text-surface-600">Añadir a</span>
                <span className="text-sm font-semibold text-surface-800">
                  {MEAL_OPTIONS.find(m => m.value === lockedMealType)?.icon} {MEAL_LABELS[lockedMealType]}
                </span>
              </div>
            ) : (
              <div>
                <label className="label">Añadir a</label>
                <div className="grid grid-cols-4 gap-2">
                  {MEAL_OPTIONS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setMealType(m.value)}
                      className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                        mealType === m.value
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-surface-200 text-surface-500'
                      }`}
                    >
                      <span className="block text-base">{m.icon}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {addError && (
              <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            {/* Add button */}
            <button
              onClick={handleAddFood}
              disabled={adding || servingGrams <= 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {adding ? (
                <>
                  <Spinner className="text-white" />
                  <span>Añadiendo...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Añadir {servingGrams > 0 ? `${servingGrams}g` : ''} al diario
                </>
              )}
            </button>

            {/* Retry hint when stuck */}
            {adding && (
              <button
                onClick={() => setAdding(false)}
                className="w-full text-center text-xs text-surface-400 hover:text-surface-600 py-1"
              >
                ¿Tarda mucho? Toca aquí para cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==================== SEARCH LIST VIEW ====================

  const recentsToShow = showAllRecents ? recentFoods : recentFoods.slice(0, 5);

  return (
    <div className="pb-28 px-4 pt-6">
      <h1 className="font-display text-2xl font-bold mb-4">Buscar alimento</h1>

      {/* Success message */}
      {addedMessage && (
        <div className="bg-brand-50 text-brand-700 text-sm px-4 py-3 rounded-2xl border border-brand-100 mb-4 flex items-center gap-2">
          <Leaf className="w-4 h-4" /> {addedMessage}
        </div>
      )}

      {/* Search bar */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          {(debouncePending || searching) ? (
            <Spinner className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-500" />
          ) : (
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          )}
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
            placeholder="Buscar por nombre o marca..."
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); setCustomResults([]); inputRef.current?.focus(); }}
              aria-label="Limpiar búsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={scanning ? stopScanner : startScanner}
          aria-label={scanning ? "Detener escáner" : "Escanear código de barras"}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors flex-shrink-0 ${
            scanning ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
          }`}
        >
          <ScanBarcode className="w-5 h-5" />
        </button>
      </div>

      {/* Filters row */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setVeganOnly(!veganOnly)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            veganOnly
              ? 'bg-brand-100 text-brand-700 border border-brand-200'
              : 'bg-surface-100 text-surface-500 border border-surface-200'
          }`}
        >
          <Leaf className="w-3 h-3" /> Solo veganos
        </button>
      </div>

      {/* Scanner container */}
      {scanning && (
        <div className="mb-4 rounded-2xl overflow-hidden border-2 border-brand-500">
          <div id="scanner-container" className="w-full" />
          <p className="text-center text-sm text-surface-500 py-2 bg-surface-50">
            Enfoca el código de barras
          </p>
        </div>
      )}

      {/* Camera permission / init error */}
      {scanError && (
        <div className="mb-4 bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl border border-red-100 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>{scanError}</span>
        </div>
      )}

      {/* Custom food modal */}
      {showCustomFoodModal && (
        <CustomFoodModal
          onClose={() => setShowCustomFoodModal(false)}
          onSaved={(food) => {
            setShowCustomFoodModal(false);
            setAddedMessage(`"${food.name}" creado correctamente`);
            setTimeout(() => setAddedMessage(null), 2500);
          }}
        />
      )}

      {/* Custom food results (instant, shown above OFF results) */}
      {!searching && customResults.length > 0 && query.length >= 2 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Mis alimentos</span>
          </div>
          <div className="space-y-2">
            {customResults.map((food) => (
              <button
                key={food.id}
                onClick={() => openCustomFoodDetail(food)}
                className="w-full card p-3 flex items-center gap-3 text-left hover:border-brand-200 transition-colors border-amber-100"
              >
                {food.image_url ? (
                  <img src={food.image_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-100" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                    <Star className="w-5 h-5 text-amber-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-surface-800 truncate">{food.name}</p>
                    <span className="flex-shrink-0 inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5" /> Propio
                    </span>
                    {food.is_vegan && (
                      <span className="flex-shrink-0 w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                        <Leaf className="w-2.5 h-2.5 text-brand-600" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400 truncate">{food.brand || 'Sin marca'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold font-mono">{Math.round(food.calories_per_100g)}</p>
                  <p className="text-[10px] text-surface-400">kcal/100g</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {searching && <SkeletonList count={5} />}

      {/* OpenFoodFacts results */}
      {!searching && results.length > 0 && (
        <div>
          {customResults.length > 0 && query.length >= 2 && (
            <div className="flex items-center gap-2 mb-2">
              <Search className="w-3.5 h-3.5 text-surface-400" />
              <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">OpenFoodFacts</span>
            </div>
          )}
          <div className="space-y-2">
            {results.map((product) => (
              <button
                key={product.code}
                onClick={() => {
                  setSelectedProduct(product);
                  setServingInput(String(product.serving_quantity || 100));
                }}
                className="w-full card p-3 flex items-center gap-3 text-left hover:border-brand-200 transition-colors"
              >
                {product.image_front_url ? (
                  <img src={product.image_front_url} alt="" className="w-12 h-12 rounded-xl object-cover bg-surface-100" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-5 h-5 text-brand-300" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-surface-800 truncate">{product.product_name}</p>
                    {isProductVegan(product) && (
                      <span className="flex-shrink-0 w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                        <Leaf className="w-2.5 h-2.5 text-brand-600" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400 truncate">{product.brands}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold font-mono">{Math.round(product.nutriments['energy-kcal_100g'])}</p>
                  <p className="text-[10px] text-surface-400">kcal/100g</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for search — with create custom food button */}
      {!searching && query.length >= 2 && results.length === 0 && customResults.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-100 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-7 h-7 text-surface-300" />
          </div>
          <p className="text-surface-500">No se encontraron resultados</p>
          <p className="text-sm text-surface-400 mt-1 mb-4">Prueba con otro término o crea tu propio alimento</p>
          <button
            onClick={() => setShowCustomFoodModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear alimento personalizado
          </button>
        </div>
      )}

      {/* Recent foods (shown when not searching) — limited with "show more" */}
      {!searching && !query && recentFoods.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-surface-400" />
              <h2 className="text-sm font-semibold text-surface-600">Recientes</h2>
            </div>
            <button
              onClick={() => setShowCustomFoodModal(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-xl transition-colors"
              title="Crear alimento personalizado"
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Crear propio
            </button>
          </div>
          <div className="space-y-2">
            {recentsToShow.map((food, i) => (
              <div
                key={food.food_name + i}
                className="card p-3 flex items-center gap-3"
              >
                {food.image_url ? (
                  <img src={food.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100" />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0">
                    <Leaf className="w-4 h-4 text-brand-300" />
                  </div>
                )}
                <button
                  onClick={() => openRecentDetail(food)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-surface-800 truncate">{food.food_name}</p>
                    {food.is_vegan && (
                      <span className="flex-shrink-0 w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                        <Leaf className="w-2.5 h-2.5 text-brand-600" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-400">
                    {food.last_serving_g}g · {Math.round(food.calories_per_100g * food.last_serving_g / 100)} kcal
                    {food.use_count > 1 && ` · ×${food.use_count}`}
                  </p>
                </button>
                <button
                  onClick={() => handleQuickAdd(food)}
                  aria-label={`Añadir ${food.food_name}`}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors flex-shrink-0"
                  title="Añadir rápido"
                >
                  <Plus className="w-4 h-4" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
          {recentFoods.length > 5 && (
            <button
              onClick={() => setShowAllRecents(!showAllRecents)}
              className="w-full mt-2 py-2 text-xs text-surface-500 hover:text-surface-700 flex items-center justify-center gap-1"
            >
              {showAllRecents ? (
                <><ChevronUp className="w-3 h-3" /> Mostrar menos</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> Ver {recentFoods.length - 5} más</>
              )}
            </button>
          )}
        </div>
      )}

      {/* Initial state (no recents, no query) */}
      {!searching && !query && recentFoods.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <ScanBarcode className="w-7 h-7 text-brand-400" />
          </div>
          <p className="text-surface-600 font-medium">Escanea o busca un alimento</p>
          <p className="text-sm text-surface-400 mt-1 mb-4">Datos de OpenFoodFacts</p>
          <button
            onClick={() => setShowCustomFoodModal(true)}
            className="btn-secondary inline-flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Crear alimento personalizado
          </button>
        </div>
      )}
    </div>
  );
}
