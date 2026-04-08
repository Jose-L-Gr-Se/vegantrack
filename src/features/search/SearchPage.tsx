import { useState, useEffect, useRef, useCallback } from 'react';
import { useBackHandler } from '@/hooks/useBackHandler';
import { searchProducts, getProductByBarcode, isProductVegan, findVeganAlternatives } from '@/lib/openfoodfacts';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { searchFreshProduce, freshItemToProduct } from '@/lib/freshProduce';
import { CustomFoodModal } from './CustomFoodModal';
import { Spinner } from '@/components/ui/Spinner';
import { SkeletonList } from '@/components/ui/Skeleton';
import { Search, ScanBarcode, X, Leaf, Plus, Clock, ChevronDown, ChevronUp, AlertCircle, Star, ChefHat } from 'lucide-react';
import type { OpenFoodFactsProduct, MealType, RecentFood, CustomFood } from '@/types';


const MEAL_OPTIONS: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Desayuno', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦' },
  { value: 'lunch', label: 'Comida', icon: 'ÃƒÆ’Ã‚Â¢Ãƒâ€¹Ã…â€œÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÆ’Ã‚Â¯Ãƒâ€šÃ‚Â¸Ãƒâ€šÃ‚Â' },
  { value: 'dinner', label: 'Cena', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢ÃƒÂ¢Ã¢â‚¬Å¾Ã‚Â¢' },
  { value: 'snack', label: 'Snacks', icon: 'ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€šÃ‚ÂÃƒâ€¦Ã‚Â½' },
];

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Desayuno',
  lunch: 'Comida',
  dinner: 'Cena',
  snack: 'Snacks',
};

// Timeout for add operation (15 seconds)
const ADD_TIMEOUT = 15000;

/**
 * Scales a raw OFF nutriment value (in grams) to the target unit.
 * Returns null when the value is missing, null, undefined, or NaN ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â
 * so callers can distinguish "truly zero" from "not reported".
 */
const scaleOrNull = (
  rawValue: unknown,
  ratio: number,
  unitMultiplier = 1,
  decimals = 2,
): number | null => {
  if (rawValue === null || rawValue === undefined || Number.isNaN(Number(rawValue))) {
    return null;
  }
  const scaled = Number(rawValue) * ratio * unitMultiplier;
  const factor = 10 ** decimals;
  return Math.round(scaled * factor) / factor;
};

interface SearchPageProps {
  initialLockedMeal?: MealType | null;
  onClearLock?: () => void;
}

export function SearchPage({ initialLockedMeal, onClearLock }: SearchPageProps) {
  const { user } = useAuthStore();
  const { addEntry, selectedDate, recentFoods, fetchRecentFoods } = useDiaryStore();
  const { searchCustomFoods } = useCustomFoodStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [customResults, setCustomResults] = useState<CustomFood[]>([]);
  const [freshResults, setFreshResults] = useState<ReturnType<typeof freshItemToProduct>[]>([]);
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

  // Listen for meal type from diary page (locked ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â no selector shown)
  useEffect(() => {
    if (initialLockedMeal) {
      setMealType(initialLockedMeal);
      setLockedMealType(initialLockedMeal);
    }
  }, [initialLockedMeal]);

  // Reset locked meal type when going back to search list
  const clearProduct = () => {
    setSelectedProduct(null);
    setAddError(null);
    setLockedMealType(null);
    onClearLock?.();
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

  // Debounced search ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â custom foods instantly, OpenFoodFacts after 300ms debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedProduct) {
      setDebouncePending(false);
      return;
    }
    if (!query.trim() || query.length < 2) {
      setResults([]);
      setCustomResults([]);
      setFreshResults([]);
      setDebouncePending(false);
      return;
    }

    // Instant: search custom foods locally
    const localResults = searchCustomFoods(query);
    setCustomResults(veganOnly ? localResults.filter((f) => f.is_vegan) : localResults);

    // Instant: search fresh produce local DB
    const fresh = searchFreshProduce(query);
    setFreshResults(fresh.map(freshItemToProduct));

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
      const { BrowserMultiFormatReader, BarcodeFormat } = await import('@zxing/browser');
      const { DecodeHintType, NotFoundException } = await import('@zxing/library');

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
      ]);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const codeReader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 150,
      });
      scannerRef.current = codeReader;

      const container = document.getElementById('scanner-container');
      if (!container) throw new Error('Scanner container not found');
      container.innerHTML = '';

      const videoEl = document.createElement('video');
      videoEl.style.width = '100%';
      videoEl.style.borderRadius = '0';
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('autoplay', 'true');
      videoEl.setAttribute('muted', 'true');
      container.appendChild(videoEl);

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      await codeReader.decodeFromConstraints(
        constraints,
        videoEl,
        (result, err) => {
          if (result) {
            stopScanner();
            const decodedText = result.getText();
            setScanning(false);
            setSearching(true);
            getProductByBarcode(decodedText).then((product) => {
              if (product) {
                setSelectedProduct(product);
                setServingInput(String(product.serving_quantity || 100));
              } else {
                setResults([]);
                setQuery(`CÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³digo: ${decodedText} (no encontrado)`);
              }
              setSearching(false);
            });
          }
          if (err && !(err instanceof NotFoundException)) {
            console.warn('Scan error:', err);
          }
        }
      );
    } catch (err: unknown) {
      console.error('Scanner error:', err);
      setScanning(false);
      const name = (err as any)?.name ?? '';
      const msg  = String((err as any)?.message ?? '');
      if (name === 'NotAllowedError' || msg.includes('Permission')) {
        setScanError('Permiso de cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡mara denegado. ActÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­valo en los ajustes del navegador.');
      } else if (name === 'NotFoundError') {
        setScanError('No se encontrÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡mara en este dispositivo.');
      } else {
        setScanError('No se pudo iniciar la cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡mara. Comprueba los permisos e intÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ntalo de nuevo.');
      }
    }
  }, []);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      try {
        scannerRef.current.reset?.();
      } catch {}
      scannerRef.current = null;
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
        setAddError('La operaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n fue interrumpida. IntÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ntalo de nuevo.');
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
      setAddError('Introduce una cantidad vÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡lida en gramos');
      return;
    }

    setAdding(true);
    setAddError(null);

    const product = selectedProduct;
    const n = product.nutriments;
    const ratio = servingGrams / 100;

    // Micros ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â OFF stores all values in grams; scaleOrNull converts and returns null when not reported
    const vitaminB12 = scaleOrNull(n['vitamin-b12_100g'], ratio, 1e6, 2);
    const iron       = scaleOrNull(n['iron_100g'],         ratio, 1000, 1);
    const zinc       = scaleOrNull(n['zinc_100g'],         ratio, 1000, 1);
    const calcium    = scaleOrNull(n['calcium_100g'],      ratio, 1000, 1);
    const vitaminD   = scaleOrNull(n['vitamin-d_100g'],    ratio, 1e6, 2);
    // Omega-3 not reliably reported in OFF
    const omega3 = null;

    // Add with timeout
    const timeoutPromise = new Promise<{ error: string }>((resolve) =>
      setTimeout(() => resolve({ error: 'La operaciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n tardÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³ demasiado. Comprueba tu conexiÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n e intÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©ntalo de nuevo.' }), ADD_TIMEOUT)
    );

    const addPromise = addEntry({
      user_id: user.id,
      date: selectedDate,
      meal_type: mealType,
      food_name: product.product_name,
      barcode: product.code || null,
      brand: product.brands || null,
      serving_size_g: servingGrams,
      calories: Math.round(n['energy-kcal_100g'] * ratio),
      protein_g: Math.round(n.proteins_100g * ratio * 10) / 10,
      carbs_g: Math.round(n.carbohydrates_100g * ratio * 10) / 10,
      fat_g: Math.round(n.fat_100g * ratio * 10) / 10,
      fiber_g: Math.round(n.fiber_100g * ratio * 10) / 10,
      sugar_g: Math.round(n.sugars_100g * ratio * 10) / 10,
      saturated_fat_g: Math.round(n['saturated-fat_100g'] * ratio * 10) / 10,
      sodium_mg: Math.round(n.sodium_100g * ratio * 1000),
      vitamin_b12_mcg: vitaminB12,
      iron_mg:         iron,
      zinc_mg:         zinc,
      calcium_mg:      calcium,
      omega3_g:        omega3,
      vitamin_d_mcg:   vitaminD,
      vitamin_b12_known: vitaminB12 !== null,
      iron_known:        iron       !== null,
      zinc_known:        zinc       !== null,
      calcium_known:     calcium    !== null,
      omega3_known:      false,
      vitamin_d_known:   vitaminD   !== null,
      source:     product.code ? 'openfoodfacts' : 'manual',
      source_ref: product.code || null,
      is_vegan: isProductVegan(product),
      image_url: product.image_front_url || null,
    });

    const result = await Promise.race([addPromise, timeoutPromise]);

    setAdding(false);
    if (result.error) {
      setAddError(result.error);
    } else {
      setSelectedProduct(null);
      setLockedMealType(null);
      onClearLock?.();
      setAddError(null);
      fetchRecentFoods(user.id);
      window.dispatchEvent(new CustomEvent('navigate-diary', {
        detail: { message: `${product.product_name} aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adido a ${MEAL_LABELS[mealType]}` }
      }));
    }
  };

  // Quick add from recent foods
  const handleQuickAdd = async (food: RecentFood) => {
    if (!user) return;
    const ratio = food.last_serving_g / 100;

    // Values in RecentFood are already in target units (mcg, mg, g) per 100 g ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â
    // preserve null when the original was unknown.
    const qB12     = food.vitamin_b12_known && food.vitamin_b12_mcg_per_100g !== null
      ? Math.round(food.vitamin_b12_mcg_per_100g * ratio * 100) / 100 : null;
    const qIron    = food.iron_known    && food.iron_mg_per_100g    !== null
      ? Math.round(food.iron_mg_per_100g    * ratio * 10)  / 10  : null;
    const qZinc    = food.zinc_known    && food.zinc_mg_per_100g    !== null
      ? Math.round(food.zinc_mg_per_100g    * ratio * 10)  / 10  : null;
    const qCalcium = food.calcium_known && food.calcium_mg_per_100g !== null
      ? Math.round(food.calcium_mg_per_100g * ratio * 10)  / 10  : null;
    const qVitD    = food.vitamin_d_known && food.vitamin_d_mcg_per_100g !== null
      ? Math.round(food.vitamin_d_mcg_per_100g * ratio * 100) / 100 : null;

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
      sodium_mg: Math.round(food.sodium_per_100g * ratio),
      vitamin_b12_mcg: qB12,
      iron_mg:         qIron,
      zinc_mg:         qZinc,
      calcium_mg:      qCalcium,
      omega3_g:        null,
      vitamin_d_mcg:   qVitD,
      vitamin_b12_known: food.vitamin_b12_known,
      iron_known:        food.iron_known,
      zinc_known:        food.zinc_known,
      calcium_known:     food.calcium_known,
      omega3_known:      false,
      vitamin_d_known:   food.vitamin_d_known,
      is_vegan: food.is_vegan,
      image_url: food.image_url,
    });

    if (!error) {
      window.dispatchEvent(new CustomEvent('navigate-diary', {
        detail: { message: `${food.food_name} aÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adido a ${MEAL_LABELS[mealType]}` }
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
        // Micros ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â stored in target units per 100g, convert back to grams for OFF format.
        // Omit the key when unknown so scaleOrNull in handleAddFood returns null (not 0).
        ...(food.vitamin_b12_mcg_per_100g !== null && { 'vitamin-b12_100g': food.vitamin_b12_mcg_per_100g / 1e6 }),
        ...(food.iron_mg_per_100g    !== null && { 'iron_100g':     food.iron_mg_per_100g    / 1000 }),
        ...(food.zinc_mg_per_100g    !== null && { 'zinc_100g':     food.zinc_mg_per_100g    / 1000 }),
        ...(food.calcium_mg_per_100g !== null && { 'calcium_100g':  food.calcium_mg_per_100g / 1000 }),
        ...(food.vitamin_d_mcg_per_100g !== null && { 'vitamin-d_100g': food.vitamin_d_mcg_per_100g / 1e6 }),
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
        'energy-kcal_100g':   food.calories_per_100g,
        proteins_100g:        food.protein_per_100g,
        carbohydrates_100g:   food.carbs_per_100g,
        fat_100g:             food.fat_per_100g,
        fiber_100g:           food.fiber_per_100g,
        sugars_100g:          food.sugar_per_100g,
        'saturated-fat_100g': food.saturated_fat_per_100g,
        sodium_100g:          food.sodium_mg_per_100g / 1000,
        // Micronutrientes ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â solo incluir si tienen valor real
        ...(food.vitamin_b12_mcg_per_100g != null && {
          'vitamin-b12_100g': food.vitamin_b12_mcg_per_100g / 1e6,
        }),
        ...(food.iron_mg_per_100g != null && {
          'iron_100g': food.iron_mg_per_100g / 1000,
        }),
        ...(food.zinc_mg_per_100g != null && {
          'zinc_100g': food.zinc_mg_per_100g / 1000,
        }),
        ...(food.calcium_mg_per_100g != null && {
          'calcium_100g': food.calcium_mg_per_100g / 1000,
        }),
        ...(food.vitamin_d_mcg_per_100g != null && {
          'vitamin-d_100g': food.vitamin_d_mcg_per_100g / 1e6,
        }),
        ...(food.omega3_g_per_100g != null && {
          'omega3_100g': food.omega3_g_per_100g,
        }),
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
      <div className="pb-32 px-4 pt-6">
        <button onClick={clearProduct} aria-label="Volver a bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºsqueda" className="status-pill mb-4 hover:text-surface-700">
          <X className="w-4 h-4" /> Volver a bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºsqueda
        </button>

        <div className="page-shell overflow-hidden">
          {selectedProduct.image_front_url && (
            <img src={selectedProduct.image_front_url} alt="" className="w-full h-52 object-contain bg-surface-50 p-5" />
          )}
          <div className="relative z-10 p-5 space-y-5">
            <div>
              <p className="section-label mb-2">Producto</p>
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

            {/* Serving selector ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â allows empty input for typing */}
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
                    1 porciÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³n ({selectedProduct.serving_quantity}g)
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
            <div className="page-shell rounded-[1.5rem] p-4 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>CalorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­as</span>
                <span className="font-mono">{servingGrams > 0 ? Math.round(n['energy-kcal_100g'] * ratio) : 0} kcal</span>
              </div>
              <div className="h-px bg-surface-200" />
              {[
                { label: 'ProteÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­nas', val: n.proteins_100g, color: 'text-blue-600' },
                { label: 'Carbohidratos', val: n.carbohydrates_100g, color: 'text-amber-600' },
                { label: '  de los cuales azÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºcares', val: n.sugars_100g, color: 'text-amber-400', indent: true },
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
                    No se encontraron alternativas veganas en esta categorÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­a
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

            {/* Meal selector ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â ONLY shown when NOT coming from diary (no lockedMealType) */}
            {lockedMealType ? (
              <div className="metric-tile px-4 py-3 flex items-center gap-2">
                <span className="text-sm text-surface-600">AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adir a</span>
                <span className="text-sm font-semibold text-surface-800">
                  {MEAL_OPTIONS.find(m => m.value === lockedMealType)?.icon} {MEAL_LABELS[lockedMealType]}
                </span>
              </div>
            ) : (
              <div>
                <label className="label">AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adir a</label>
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
                  <span>AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adiendo...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adir {servingGrams > 0 ? `${servingGrams}g` : ''} al diario
                </>
              )}
            </button>

            {/* Retry hint when stuck */}
            {adding && (
              <button
                onClick={() => setAdding(false)}
                className="w-full text-center text-xs text-surface-400 hover:text-surface-600 py-1"
              >
                ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â¿Tarda mucho? Toca aquÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â­ para cancelar
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
    <div className="pb-32 px-4 pt-6">
      <div className="page-shell p-5 mb-4">
        <div className="relative z-10 flex items-start justify-between gap-3">
        <div>
          <p className="section-label mb-2">Buscar</p>
          <h1 className="font-display text-[2rem] font-bold tracking-[-0.05em] text-surface-900">Buscar alimento</h1>
          <p className="text-sm text-surface-500 mt-2">Busca por nombre, marca o escaneo sin cambiar el flujo actual.</p>
        </div>
        <div className="icon-badge">
          <Search className="w-5 h-5 text-brand-600" />
        </div>
      </div>
      </div>

      {/* Success message */}
      {addedMessage && (
        <div className="card text-brand-700 text-sm px-4 py-3 mb-4 flex items-center gap-2">
          <Leaf className="w-4 h-4" /> {addedMessage}
        </div>
      )}

      <div className="page-shell p-4 mb-4">
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
              aria-label="Limpiar bÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Âºsqueda"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={scanning ? stopScanner : startScanner}
          aria-label={scanning ? "Detener escÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡ner" : "Escanear cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³digo de barras"}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors flex-shrink-0 ${
            scanning ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
          }`}
        >
          <ScanBarcode className="w-5 h-5" />
        </button>
      </div>

      {/* Filters row */}
      <div className="flex gap-2">
        <button
          onClick={() => setVeganOnly(!veganOnly)}
          className={`status-pill ${
            veganOnly
              ? 'bg-brand-100 text-brand-700 border border-brand-200'
              : 'text-surface-500'
          }`}
        >
          <Leaf className="w-3 h-3" /> Solo veganos
        </button>
      </div>
      </div>
      {scanning && (
        <div className="mb-4 card overflow-hidden border-2 border-brand-500">
          <div id="scanner-container" className="w-full" />
          <p className="text-center text-sm text-surface-500 py-2 bg-surface-50">
            Enfoca el cÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â³digo de barras
          </p>
        </div>
      )}
      {/* Camera permission / init error */}
      {scanError && (
        <div className="mb-4 card text-red-600 text-sm px-4 py-3 flex items-start gap-2">
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

      {/* Frescos - base de datos local verificada */}
      {freshResults.length > 0 && query.length >= 2 && !selectedProduct && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-base">ÃƒÆ’Ã‚Â°Ãƒâ€¦Ã‚Â¸Ãƒâ€¦Ã¢â‚¬â„¢Ãƒâ€šÃ‚Â±</span>
            <span className="text-xs font-semibold text-surface-500 uppercase tracking-wide">Frescos ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· datos verificados</span>
          </div>
          <div className="space-y-2">
            {freshResults.map((product) => (
              <button
                key={product.code}
                onClick={() => {
                  setSelectedProduct(product as any);
                  setServingInput('100');
                }}
                className="w-full card p-3 flex items-center gap-3 text-left hover:border-brand-200 transition-colors border-brand-100"
              >
                <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center flex-shrink-0 text-2xl">
                  {(product as any)._emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-surface-800 truncate">{product.product_name}</p>
                    <span className="flex-shrink-0 w-4 h-4 bg-brand-100 rounded-full flex items-center justify-center">
                      <Leaf className="w-2.5 h-2.5 text-brand-600" />
                    </span>
                  </div>
                  <p className="text-xs text-surface-400">BEDCA ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {product.nutriments['energy-kcal_100g']} kcal/100g</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold font-mono">{product.nutriments['energy-kcal_100g']}</p>
                  <p className="text-[10px] text-surface-400">kcal/100g</p>
                </div>
              </button>
            ))}
          </div>
        </div>
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
          {(customResults.length > 0 || freshResults.length > 0) && query.length >= 2 && (
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

      {/* Empty state for search ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â with create custom food button */}
      {!searching && query.length >= 2 && results.length === 0 && customResults.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-100 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-7 h-7 text-surface-300" />
          </div>
          <p className="text-surface-500">No se encontraron resultados</p>
          <p className="text-sm text-surface-400 mt-1 mb-4">Prueba con otro tÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©rmino o crea tu propio alimento</p>
          <button
            onClick={() => setShowCustomFoodModal(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Crear alimento personalizado
          </button>
        </div>
      )}

      {/* Recent foods (shown when not searching) ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â limited with "show more" */}
      {!searching && !query && recentFoods.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-surface-400" />
              <h2 className="text-sm font-semibold text-surface-600">Recientes</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCustomFoodModal(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-xl transition-colors"
                title="Crear alimento personalizado"
              >
                <Plus className="w-3 h-3" strokeWidth={2.5} /> Crear propio
              </button>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('navigate-recipes'))}
                className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-xl transition-colors"
              >
                <ChefHat className="w-3 h-3" /> Recetas
              </button>
            </div>
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
                    {food.last_serving_g}g ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· {Math.round(food.calories_per_100g * food.last_serving_g / 100)} kcal
                    {food.use_count > 1 && ` ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â· ÃƒÆ’Ã†â€™ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â${food.use_count}`}
                  </p>
                </button>
                <button
                  onClick={() => handleQuickAdd(food)}
                  aria-label={`AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adir ${food.food_name}`}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors flex-shrink-0"
                  title="AÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â±adir rÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡pido"
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
                <><ChevronDown className="w-3 h-3" /> Ver {recentFoods.length - 5} mÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¡s</>
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
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate-recipes'))}
            className="btn-secondary inline-flex items-center gap-2 text-sm mt-2"
          >
            <ChefHat className="w-4 h-4" /> Mis Recetas
          </button>
        </div>
      )}
    </div>
  );
}
