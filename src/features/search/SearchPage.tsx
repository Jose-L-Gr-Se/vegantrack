import { useState, useEffect, useRef, useCallback } from 'react';
import { searchProducts, getProductByBarcode, isProductVegan } from '@/lib/openfoodfacts';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { Spinner } from '@/components/ui/Spinner';
import { Search, ScanBarcode, X, Leaf, Plus, ChevronDown } from 'lucide-react';
import type { OpenFoodFactsProduct, MealType } from '@/types';

const MEAL_OPTIONS: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { value: 'lunch', label: 'Comida', icon: '☀️' },
  { value: 'dinner', label: 'Cena', icon: '🌙' },
  { value: 'snack', label: 'Snacks', icon: '🍎' },
];

export function SearchPage() {
  const { user } = useAuthStore();
  const { addEntry, selectedDate } = useDiaryStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OpenFoodFactsProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [veganOnly, setVeganOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OpenFoodFactsProduct | null>(null);
  const [servingGrams, setServingGrams] = useState(100);
  const [mealType, setMealType] = useState<MealType>('lunch');
  const [adding, setAdding] = useState(false);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<any>(null);

  // Listen for meal type from diary page
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail) setMealType(e.detail);
    };
    window.addEventListener('navigate-search', handler as any);
    return () => window.removeEventListener('navigate-search', handler as any);
  }, []);

  // Debounced search — stops when a product is selected
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (selectedProduct) return; // Don't search while viewing a product
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      const res = await searchProducts(query, 1, veganOnly);
      setResults(res.products);
      setSearching(false);
    }, 500);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, veganOnly, selectedProduct]);

  const startScanner = useCallback(async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('scanner-container');
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 150 } },
        async (decodedText) => {
          await scanner.stop();
          setScanning(false);
          setSearching(true);
          const product = await getProductByBarcode(decodedText);
          if (product) {
            setSelectedProduct(product);
            setServingGrams(product.serving_quantity || 100);
          } else {
            setResults([]);
            setQuery(`Código: ${decodedText} (no encontrado)`);
          }
          setSearching(false);
        },
        () => {} // ignore errors
      );
    } catch (err) {
      console.error('Scanner error:', err);
      setScanning(false);
    }
  }, []);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {}
    }
    setScanning(false);
  }, []);

  const handleAddFood = async () => {
    if (!selectedProduct || !user) return;
    setAdding(true);

    const n = selectedProduct.nutriments;
    const ratio = servingGrams / 100;

    const { error } = await addEntry({
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
      is_vegan: isProductVegan(selectedProduct),
      image_url: selectedProduct.image_front_url || null,
    });

    setAdding(false);
    if (!error) {
      setAddedMessage(`${selectedProduct.product_name} añadido`);
      setSelectedProduct(null);
      setTimeout(() => setAddedMessage(null), 2000);
    }
  };

  // Product detail / add modal
  if (selectedProduct) {
    const n = selectedProduct.nutriments;
    const ratio = servingGrams / 100;
    const vegan = isProductVegan(selectedProduct);

    return (
      <div className="pb-28 px-4 pt-6">
        <button onClick={() => setSelectedProduct(null)} className="flex items-center gap-1 text-sm text-surface-500 mb-4 hover:text-surface-700">
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

            {/* Serving selector */}
            <div>
              <label className="label">Cantidad (gramos)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={servingGrams}
                  onChange={(e) => setServingGrams(Math.max(1, +e.target.value))}
                  className="input flex-1 font-mono"
                  min={1}
                />
                {selectedProduct.serving_quantity > 0 && (
                  <button
                    onClick={() => setServingGrams(selectedProduct.serving_quantity)}
                    className="btn-secondary text-xs whitespace-nowrap"
                  >
                    1 porción ({selectedProduct.serving_quantity}g)
                  </button>
                )}
              </div>
            </div>

            {/* Nutrients */}
            <div className="bg-surface-50 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between font-semibold">
                <span>Calorías</span>
                <span className="font-mono">{Math.round(n['energy-kcal_100g'] * ratio)} kcal</span>
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
                  <span className={`font-mono ${item.color}`}>{(item.val * ratio).toFixed(1)}g</span>
                </div>
              ))}
            </div>

            {/* Meal selector */}
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

            <button
              onClick={handleAddFood}
              disabled={adding}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {adding ? <Spinner className="text-white" /> : (
                <><Plus className="w-4 h-4" /> Añadir al diario</>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

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
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-10"
            placeholder="Buscar por nombre o marca..."
          />
          {query && (
            <button
              onClick={() => { setQuery(''); setResults([]); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400 hover:text-surface-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={scanning ? stopScanner : startScanner}
          className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-colors flex-shrink-0 ${
            scanning ? 'bg-red-100 text-red-600' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'
          }`}
        >
          <ScanBarcode className="w-5 h-5" />
        </button>
      </div>

      {/* Vegan filter */}
      <button
        onClick={() => setVeganOnly(!veganOnly)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all mb-4 ${
          veganOnly
            ? 'bg-brand-100 text-brand-700 border border-brand-200'
            : 'bg-surface-100 text-surface-500 border border-surface-200'
        }`}
      >
        <Leaf className="w-3 h-3" /> Solo veganos
      </button>

      {/* Scanner container */}
      {scanning && (
        <div className="mb-4 rounded-2xl overflow-hidden border-2 border-brand-500">
          <div id="scanner-container" className="w-full" />
          <p className="text-center text-sm text-surface-500 py-2 bg-surface-50">
            Enfoca el código de barras
          </p>
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="flex items-center justify-center py-12">
          <Spinner className="text-brand-500 w-6 h-6" />
        </div>
      )}

      {/* Results */}
      {!searching && results.length > 0 && (
        <div className="space-y-2">
          {results.map((product) => (
            <button
              key={product.code}
              onClick={() => {
                setSelectedProduct(product);
                setServingGrams(product.serving_quantity || 100);
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
      )}

      {/* Empty state */}
      {!searching && query.length >= 2 && results.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-surface-100 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <Search className="w-7 h-7 text-surface-300" />
          </div>
          <p className="text-surface-500">No se encontraron resultados</p>
          <p className="text-sm text-surface-400 mt-1">Prueba con otro término de búsqueda</p>
        </div>
      )}

      {/* Initial state */}
      {!searching && !query && results.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-3">
            <ScanBarcode className="w-7 h-7 text-brand-400" />
          </div>
          <p className="text-surface-600 font-medium">Escanea o busca un alimento</p>
          <p className="text-sm text-surface-400 mt-1">Datos de OpenFoodFacts</p>
        </div>
      )}
    </div>
  );
}
