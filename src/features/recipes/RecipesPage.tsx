import { useState, useEffect, useRef } from 'react';
import {
  ChefHat, Plus, Trash2, ChevronLeft, Edit2,
  Search, X, Leaf, Check, AlertCircle, Users,
} from 'lucide-react';
import { useRecipeStore, computeRecipeNutrients } from '@/stores/recipeStore';
import { useAuthStore } from '@/stores/authStore';
import { useDiaryStore } from '@/stores/diaryStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { searchProducts } from '@/lib/openfoodfacts';
import type {
  Recipe, RecipeIngredient, RecentFood,
  MealType, OpenFoodFactsProduct, CustomFood,
} from '@/types';
import { usePro } from '@/hooks/usePro';
import { ProModal } from '@/features/pro/ProModal';

type PageView = 'list' | 'detail' | 'editor';

const MEALS: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { value: 'lunch',     label: 'Comida',   icon: '☀️' },
  { value: 'dinner',    label: 'Cena',     icon: '🌙' },
  { value: 'snack',     label: 'Snacks',   icon: '🍎' },
];

interface RecipesPageProps {
  onBack: () => void;
}

export function RecipesPage({ onBack }: RecipesPageProps) {
  const { user } = useAuthStore();
  const { recipes, loading, fetchRecipes, createRecipe, updateRecipe, deleteRecipe, addIngredient, removeIngredient, logRecipe } = useRecipeStore();
  const { recentFoods, selectedDate } = useDiaryStore();
  const { customFoods } = useCustomFoodStore();

  const { isPro } = usePro();
  const [showProModal, setShowProModal] = useState(false);
  const FREE_RECIPE_LIMIT = 3;

  const [view, setView]                     = useState<PageView>('list');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editorRecipe, setEditorRecipe]     = useState<Recipe | null>(null);
  const [editorName, setEditorName]         = useState('');
  const [editorDesc, setEditorDesc]         = useState('');
  const [editorServings, setEditorServings] = useState('1');
  const [savingHeader, setSavingHeader]     = useState(false);
  const [headerSaved, setHeaderSaved]       = useState(false);
  const [editorOrigin, setEditorOrigin]     = useState<'list' | 'detail'>('list');
  const savedValuesRef = useRef({ name: '', desc: '', servings: '1' });

  // Log dialog
  const [logDialog, setLogDialog] = useState<{ recipe: Recipe; mealType: MealType; servings: string } | null>(null);
  const [logging, setLogging]     = useState(false);
  const [logError, setLogError]   = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState<string | null>(null);

  // Ingredient picker
  const [showPicker, setShowPicker]           = useState(false);
  const [pickerQuery, setPickerQuery]         = useState('');
  const [pickerResults, setPickerResults]     = useState<OpenFoodFactsProduct[]>([]);
  const [pickerSearching, setPickerSearching] = useState(false);
  const [pickerSelected, setPickerSelected]   = useState<RecentFood | OpenFoodFactsProduct | CustomFood | null>(null);
  const [pickerGrams, setPickerGrams]         = useState('100');
  const [addingIng, setAddingIng]             = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (user) fetchRecipes(user.id);
  }, [user?.id]);

  // Keep selectedRecipe / editorRecipe in sync after store updates
  useEffect(() => {
    if (selectedRecipe) {
      const up = recipes.find(r => r.id === selectedRecipe.id);
      if (up) setSelectedRecipe(up);
    }
    if (editorRecipe) {
      const up = recipes.find(r => r.id === editorRecipe.id);
      if (up) setEditorRecipe(up);
    }
  }, [recipes]);

  // Picker search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!pickerQuery.trim() || pickerQuery.length < 2) { setPickerResults([]); setPickerSearching(false); return; }
    setPickerSearching(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchProducts(pickerQuery, 1, false);
      setPickerResults(res.products);
      setPickerSearching(false);
    }, 400);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [pickerQuery]);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const isRecent = (f: any): f is RecentFood       => 'last_serving_g' in f;
  const isOFDS   = (f: any): f is OpenFoodFactsProduct => 'nutriments' in f;

  const openCreate = () => {
    setEditorName(''); setEditorDesc(''); setEditorServings('1');
    savedValuesRef.current = { name: '', desc: '', servings: '1' };
    setEditorRecipe(null); setHeaderSaved(false); setEditorOrigin('list'); setView('editor');
  };
  const openEdit = (r: Recipe, origin: 'list' | 'detail' = 'list') => {
    setEditorName(r.name); setEditorDesc(r.description ?? '');
    setEditorServings(String(r.total_servings));
    savedValuesRef.current = { name: r.name, desc: r.description ?? '', servings: String(r.total_servings) };
    setEditorRecipe(r); setHeaderSaved(true); setEditorOrigin(origin); setView('editor');
  };

  const handleSaveHeader = async () => {
    if (!user || !editorName.trim()) return;
    setSavingHeader(true);
    const servings = Math.max(1, parseFloat(editorServings) || 1);
    if (!editorRecipe) {
      const r = await createRecipe(user.id, editorName.trim(), editorDesc.trim(), servings);
      if (r) {
        savedValuesRef.current = { name: editorName.trim(), desc: editorDesc.trim(), servings: editorServings };
        setEditorRecipe(r); setHeaderSaved(true);
      }
    } else {
      await updateRecipe(editorRecipe.id, {
        name: editorName.trim(),
        description: editorDesc.trim() || null,
        total_servings: servings,
      } as any);
      savedValuesRef.current = { name: editorName.trim(), desc: editorDesc.trim(), servings: editorServings };
      setHeaderSaved(true);
    }
    setSavingHeader(false);
  };

  const handlePickFood = (food: RecentFood | OpenFoodFactsProduct | CustomFood) => {
    setPickerSelected(food);
    setPickerGrams(
      isRecent(food) ? String(food.last_serving_g)
      : isOFDS(food) ? String(food.serving_quantity || 100)
      : '100'
    );
  };

  const handleConfirmIngredient = async () => {
    if (!pickerSelected || !editorRecipe) return;
    const grams = parseFloat(pickerGrams);
    if (isNaN(grams) || grams <= 0) return;
    setAddingIng(true);

    let ing: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at'>;

    if (isRecent(pickerSelected)) {
      const f = pickerSelected;
      ing = {
        food_name: f.food_name, brand: f.brand, barcode: f.barcode,
        serving_size_g: grams,
        calories_per_100g: f.calories_per_100g, protein_per_100g: f.protein_per_100g,
        carbs_per_100g: f.carbs_per_100g, fat_per_100g: f.fat_per_100g,
        fiber_per_100g: f.fiber_per_100g, sugar_per_100g: f.sugar_per_100g,
        saturated_fat_per_100g: f.saturated_fat_per_100g, sodium_mg_per_100g: f.sodium_per_100g,
        vitamin_b12_mcg_per_100g: f.vitamin_b12_mcg_per_100g, iron_mg_per_100g: f.iron_mg_per_100g,
        zinc_mg_per_100g: f.zinc_mg_per_100g, calcium_mg_per_100g: f.calcium_mg_per_100g,
        vitamin_d_mcg_per_100g: f.vitamin_d_mcg_per_100g, omega3_g_per_100g: f.omega3_g_per_100g,
        vitamin_b12_known: f.vitamin_b12_known, iron_known: f.iron_known,
        zinc_known: f.zinc_known, calcium_known: f.calcium_known,
        vitamin_d_known: f.vitamin_d_known, omega3_known: f.omega3_known,
        is_vegan: f.is_vegan, image_url: f.image_url,
        sort_order: editorRecipe.ingredients.length,
      };
    } else if (isOFDS(pickerSelected)) {
      const n = pickerSelected.nutriments;
      ing = {
        food_name: pickerSelected.product_name, brand: pickerSelected.brands || null,
        barcode: pickerSelected.code || null, serving_size_g: grams,
        calories_per_100g: n['energy-kcal_100g'] || 0, protein_per_100g: n.proteins_100g || 0,
        carbs_per_100g: n.carbohydrates_100g || 0, fat_per_100g: n.fat_100g || 0,
        fiber_per_100g: n.fiber_100g || 0, sugar_per_100g: n.sugars_100g || 0,
        saturated_fat_per_100g: n['saturated-fat_100g'] || 0,
        sodium_mg_per_100g: (n.sodium_100g || 0) * 1000,
        vitamin_b12_mcg_per_100g: n['vitamin-b12_100g'] != null ? n['vitamin-b12_100g']! * 1e6 : null,
        iron_mg_per_100g:    n['iron_100g']    != null ? n['iron_100g']!    * 1000 : null,
        zinc_mg_per_100g:    n['zinc_100g']    != null ? n['zinc_100g']!    * 1000 : null,
        calcium_mg_per_100g: n['calcium_100g'] != null ? n['calcium_100g']! * 1000 : null,
        vitamin_d_mcg_per_100g: n['vitamin-d_100g'] != null ? n['vitamin-d_100g']! * 1e6 : null,
        omega3_g_per_100g: null,
        vitamin_b12_known: n['vitamin-b12_100g'] != null, iron_known: n['iron_100g'] != null,
        zinc_known: n['zinc_100g'] != null, calcium_known: n['calcium_100g'] != null,
        vitamin_d_known: n['vitamin-d_100g'] != null, omega3_known: false,
        is_vegan: false, image_url: pickerSelected.image_front_url || null,
        sort_order: editorRecipe.ingredients.length,
      };
    } else {
      const f = pickerSelected as CustomFood;
      ing = {
        food_name: f.name, brand: f.brand, barcode: null, serving_size_g: grams,
        calories_per_100g: f.calories_per_100g, protein_per_100g: f.protein_per_100g,
        carbs_per_100g: f.carbs_per_100g, fat_per_100g: f.fat_per_100g,
        fiber_per_100g: f.fiber_per_100g, sugar_per_100g: f.sugar_per_100g,
        saturated_fat_per_100g: f.saturated_fat_per_100g, sodium_mg_per_100g: f.sodium_mg_per_100g,
        vitamin_b12_mcg_per_100g: f.vitamin_b12_mcg_per_100g, iron_mg_per_100g: f.iron_mg_per_100g,
        zinc_mg_per_100g: f.zinc_mg_per_100g, calcium_mg_per_100g: f.calcium_mg_per_100g,
        vitamin_d_mcg_per_100g: f.vitamin_d_mcg_per_100g, omega3_g_per_100g: f.omega3_g_per_100g,
        vitamin_b12_known: f.vitamin_b12_mcg_per_100g !== null, iron_known: f.iron_mg_per_100g !== null,
        zinc_known: f.zinc_mg_per_100g !== null, calcium_known: f.calcium_mg_per_100g !== null,
        vitamin_d_known: f.vitamin_d_mcg_per_100g !== null, omega3_known: f.omega3_g_per_100g !== null,
        is_vegan: f.is_vegan, image_url: f.image_url,
        sort_order: editorRecipe.ingredients.length,
      };
    }

    await addIngredient(editorRecipe.id, ing);
    setPickerSelected(null); setPickerGrams('100'); setPickerQuery(''); setAddingIng(false);
  };

  const handleLog = async () => {
    if (!user || !logDialog) return;
    setLogging(true); setLogError(null);
    const servings = Math.max(0.5, parseFloat(logDialog.servings) || 1);
    const { error } = await logRecipe(user.id, selectedDate, logDialog.mealType, logDialog.recipe, servings);
    setLogging(false);
    if (error) { setLogError(error); }
    else {
      const name = logDialog.recipe.name;
      setLogDialog(null);
      setLogSuccess(`"${name}" añadido ✓`);
      setTimeout(() => {
        setLogSuccess(null);
        window.dispatchEvent(new CustomEvent('navigate-diary', { detail: { message: `${name} añadido al diario` } }));
      }, 1200);
    }
  };

  // ── Ingredient picker sheet ───────────────────────────────────────────────
  const filteredRecents = pickerQuery.length >= 2
    ? recentFoods.filter(f => f.food_name.toLowerCase().includes(pickerQuery.toLowerCase()))
    : recentFoods;
  const filteredCustom = pickerQuery.length >= 2
    ? customFoods.filter(f => f.name.toLowerCase().includes(pickerQuery.toLowerCase()))
    : customFoods;

  const IngredientPicker = () => (
    <div className="fixed inset-0 z-[70] bg-black/50 flex flex-col justify-end" onClick={() => { setShowPicker(false); setPickerSelected(null); }}>
      <div className="card rounded-t-[2rem] max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-surface-300 rounded-full" />
        </div>

        {pickerSelected ? (
          /* Gram confirmation */
          <div className="px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-surface-900">
                {isRecent(pickerSelected) ? pickerSelected.food_name
                 : isOFDS(pickerSelected) ? pickerSelected.product_name
                 : (pickerSelected as CustomFood).name}
              </h3>
              <button onClick={() => setPickerSelected(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100">
                <X className="w-4 h-4 text-surface-500" />
              </button>
            </div>
            <div>
              <label className="label">Cantidad (gramos)</label>
              <input
                type="number" inputMode="decimal" step="1" min="1"
                value={pickerGrams}
                onChange={e => setPickerGrams(e.target.value)}
                className="input font-mono text-lg text-center"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                {[50, 100, 150, 200].map(g => (
                  <button key={g} onClick={() => setPickerGrams(String(g))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      pickerGrams === String(g) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500'
                    }`}>{g}g</button>
                ))}
              </div>
            </div>
            <button
              onClick={handleConfirmIngredient}
              disabled={addingIng || !pickerGrams || parseFloat(pickerGrams) <= 0}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {addingIng ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Check className="w-4 h-4" /> Añadir a la receta</>}
            </button>
          </div>
        ) : (
          /* Food list */
          <>
            <div className="px-4 pb-3">
              <div className="relative">
                {pickerSearching
                  ? <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  : <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                }
                <input
                  type="text" value={pickerQuery}
                  onChange={e => setPickerQuery(e.target.value)}
                  placeholder="Buscar alimento..."
                  className="input pl-10"
                  autoFocus
                />
                {pickerQuery && (
                  <button onClick={() => { setPickerQuery(''); setPickerResults([]); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] space-y-1">
              {/* Custom foods */}
              {filteredCustom.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide pt-1 pb-1">Mis alimentos</p>
                  {filteredCustom.slice(0, 5).map(f => (
                    <button key={f.id} onClick={() => handlePickFood(f)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-50 transition-colors text-left">
                      <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Leaf className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{f.name}</p>
                        <p className="text-xs text-surface-400">{Math.round(f.calories_per_100g)} kcal/100g</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Recents */}
              {filteredRecents.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide pt-2 pb-1">Recientes</p>
                  {filteredRecents.slice(0, 10).map((f, i) => (
                    <button key={f.food_name + i} onClick={() => handlePickFood(f)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-50 transition-colors text-left">
                      {f.image_url
                        ? <img src={f.image_url} alt="" className="w-9 h-9 rounded-xl object-cover bg-surface-100 flex-shrink-0" />
                        : <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0"><Leaf className="w-4 h-4 text-brand-300" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{f.food_name}</p>
                        <p className="text-xs text-surface-400">{f.last_serving_g}g · {Math.round(f.calories_per_100g * f.last_serving_g / 100)} kcal</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* OpenFoodFacts results */}
              {pickerResults.length > 0 && (
                <>
                  <p className="text-[10px] font-semibold text-surface-400 uppercase tracking-wide pt-2 pb-1">OpenFoodFacts</p>
                  {pickerResults.slice(0, 8).map(p => (
                    <button key={p.code} onClick={() => handlePickFood(p)}
                      className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-surface-50 transition-colors text-left">
                      {p.image_front_url
                        ? <img src={p.image_front_url} alt="" className="w-9 h-9 rounded-xl object-cover bg-surface-100 flex-shrink-0" />
                        : <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0"><Leaf className="w-4 h-4 text-brand-300" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{p.product_name}</p>
                        <p className="text-xs text-surface-400">{p.brands} · {Math.round(p.nutriments['energy-kcal_100g'])} kcal/100g</p>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {pickerQuery.length >= 2 && !pickerSearching && pickerResults.length === 0 && filteredRecents.length === 0 && filteredCustom.length === 0 && (
                <p className="text-center text-sm text-surface-400 py-8">Sin resultados para "{pickerQuery}"</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── Log dialog ────────────────────────────────────────────────────────────
  const LogDialogModal = () => {
    if (!logDialog) return null;
    const servings = Math.max(0.5, parseFloat(logDialog.servings) || 1);
    const t = computeRecipeNutrients(logDialog.recipe.ingredients, servings / logDialog.recipe.total_servings);
    return (
      <div className="fixed inset-0 z-[70] bg-black/50 flex items-end justify-center" onClick={() => { setLogDialog(null); setLogError(null); }}>
        <div className="card rounded-t-[2rem] w-full max-w-lg overflow-y-auto overscroll-contain pb-[calc(env(safe-area-inset-bottom)+5rem)] max-h-[calc(100vh-4rem)]" onClick={e => e.stopPropagation()}>
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-surface-300 rounded-full" /></div>
          <div className="px-5 pb-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-surface-900">{logDialog.recipe.name}</h3>
            <button onClick={() => setLogDialog(null)} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100">
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>

          {/* Servings */}
          {logDialog.recipe.total_servings > 1 && (
            <div>
              <label className="label">Porciones ({logDialog.recipe.total_servings} totales)</label>
              <div className="flex gap-2">
                {Array.from({ length: Math.min(logDialog.recipe.total_servings, 4) }, (_, i) => i + 1).map(n => (
                  <button key={n} onClick={() => setLogDialog(d => d ? { ...d, servings: String(n) } : null)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      logDialog.servings === String(n) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500'
                    }`}>{n}</button>
                ))}
              </div>
            </div>
          )}

          {/* Nutrition preview */}
          <div className="bg-surface-50 rounded-2xl p-3 flex justify-around text-center">
            <div><p className="font-bold text-surface-900 font-mono">{t.calories}</p><p className="text-[10px] text-surface-400">kcal</p></div>
            <div><p className="font-bold text-blue-600 font-mono">{t.protein_g}g</p><p className="text-[10px] text-surface-400">prot</p></div>
            <div><p className="font-bold text-amber-600 font-mono">{t.carbs_g}g</p><p className="text-[10px] text-surface-400">carbs</p></div>
            <div><p className="font-bold text-purple-600 font-mono">{t.fat_g}g</p><p className="text-[10px] text-surface-400">grasa</p></div>
          </div>

          {/* Meal selector */}
          <div className="grid grid-cols-4 gap-2">
            {MEALS.map(m => (
              <button key={m.value} onClick={() => setLogDialog(d => d ? { ...d, mealType: m.value } : null)}
                className={`py-2 rounded-xl text-xs font-semibold border-2 transition-all ${
                  logDialog.mealType === m.value ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500'
                }`}>
                <span className="block text-base">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>

          {logError && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-3 py-2 rounded-xl border border-red-100">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />{logError}
            </div>
          )}

          <button onClick={handleLog} disabled={logging}
            className="btn-primary w-full flex items-center justify-center gap-2">
            {logging
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><Plus className="w-4 h-4" /> Añadir al diario</>
            }
          </button>
          </div>
        </div>
      </div>
    );
  };

  // ── EDITOR VIEW ───────────────────────────────────────────────────────────
  if (view === 'editor') {
    const hasUnsavedChanges = headerSaved && editorRecipe && (
      editorName.trim() !== savedValuesRef.current.name ||
      editorDesc.trim() !== savedValuesRef.current.desc ||
      editorServings !== savedValuesRef.current.servings
    );
    const isActuallySaved = headerSaved && editorRecipe && !hasUnsavedChanges;

    return (
      <div className="pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 pt-6">
        <div className="page-shell px-5 py-5 mb-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setView(editorOrigin)} className="icon-badge">
              <ChevronLeft className="w-5 h-5 text-surface-700" />
            </button>
            <div className="relative z-10">
              <p className="section-label mb-2">Recetas</p>
              <h1 className="font-display text-[2rem] font-bold tracking-[-0.05em] text-surface-900">{editorRecipe ? 'Editar receta' : 'Nueva receta'}</h1>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Header form */}
          <div className="card p-4 space-y-3">
            <div>
              <label className="label">Nombre de la receta *</label>
              <input type="text" value={editorName} onChange={e => setEditorName(e.target.value)}
                placeholder="Ej: Desayuno habitual, Buddha bowl, Porridge..."
                className="input" />
            </div>
            <div>
              <label className="label">Descripción (opcional)</label>
              <input type="text" value={editorDesc} onChange={e => setEditorDesc(e.target.value)}
                placeholder="Notas, hints, para qué la usas..." className="input" />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" /> Número de porciones
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4].map(n => (
                  <button key={n} onClick={() => setEditorServings(String(n))}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      editorServings === String(n) ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-surface-200 text-surface-500'
                    }`}>{n}</button>
                ))}
              </div>
              <p className="text-xs text-surface-400 mt-1.5">Si cocinas para 2, pon 2 para que las calorías se calculen por porción</p>
            </div>
            <button onClick={handleSaveHeader} disabled={savingHeader || !editorName.trim()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-colors text-sm ${
                isActuallySaved ? 'bg-surface-100 text-surface-600' : 'bg-brand-600 hover:bg-brand-700 text-white'
              }`}>
              {savingHeader
                ? <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                : isActuallySaved
                  ? <><Check className="w-4 h-4 text-green-500" /> Guardado</>
                  : hasUnsavedChanges ? 'Guardar cambios' : 'Guardar receta'
              }
            </button>
            {!editorRecipe && editorName.trim() && (
              <p className="text-xs text-surface-400 text-center -mt-1">
                Guarda la receta para poder añadir ingredientes
              </p>
            )}
          </div>

          {/* Ingredients */}
          {editorRecipe && (
            <div className="card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-surface-50">
                <span className="font-semibold text-surface-800 text-sm">
                  Ingredientes ({editorRecipe.ingredients.length})
                </span>
                <button onClick={() => { setShowPicker(true); setPickerQuery(''); setPickerSelected(null); }}
                  className="flex items-center gap-1 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-xl transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Añadir
                </button>
              </div>

              {editorRecipe.ingredients.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-surface-400">Sin ingredientes todavía</p>
                  <p className="text-xs text-surface-300 mt-1">Toca "Añadir" para empezar</p>
                </div>
              ) : (
                <div className="divide-y divide-surface-50">
                  {editorRecipe.ingredients.map(ing => (
                    <div key={ing.id} className="flex items-center gap-3 px-4 py-3">
                      {ing.image_url
                        ? <img src={ing.image_url} alt="" className="w-9 h-9 rounded-xl object-cover bg-surface-100 flex-shrink-0" />
                        : <div className="w-9 h-9 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0"><Leaf className="w-4 h-4 text-brand-300" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-surface-800 truncate">{ing.food_name}</p>
                        <p className="text-xs text-surface-400">{ing.serving_size_g}g · {Math.round(ing.calories_per_100g * ing.serving_size_g / 100)} kcal</p>
                      </div>
                      <button onClick={() => removeIngredient(ing.id, editorRecipe.id)}
                        className="w-8 h-8 flex items-center justify-center text-surface-300 hover:text-red-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Totals preview */}
              {editorRecipe.ingredients.length > 0 && (() => {
                const t = computeRecipeNutrients(editorRecipe.ingredients, 1 / editorRecipe.total_servings);
                return (
                  <div className="bg-surface-50 px-4 py-3 border-t border-surface-100">
                    <p className="text-[10px] text-surface-400 font-semibold uppercase mb-1.5">
                      Por porción{editorRecipe.total_servings > 1 ? ` (1 de ${editorRecipe.total_servings})` : ''}
                    </p>
                    <div className="flex gap-4">
                      <span className="text-sm font-bold font-mono">{t.calories} kcal</span>
                      <span className="text-sm text-blue-600 font-mono">P{t.protein_g}g</span>
                      <span className="text-sm text-amber-600 font-mono">C{t.carbs_g}g</span>
                      <span className="text-sm text-purple-600 font-mono">G{t.fat_g}g</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* Delete recipe */}
          {editorRecipe && (
            <button onClick={() => { deleteRecipe(editorRecipe.id); setView('list'); }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-red-500 hover:bg-red-50 text-sm font-medium transition-colors border border-red-100">
              <Trash2 className="w-4 h-4" /> Eliminar receta
            </button>
          )}
        </div>

        {showPicker && <IngredientPicker />}
      </div>
    );
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === 'detail' && selectedRecipe) {
    const totals = computeRecipeNutrients(selectedRecipe.ingredients);
    const perServing = computeRecipeNutrients(selectedRecipe.ingredients, 1 / selectedRecipe.total_servings);
    return (
      <div className="pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 pt-6">
        <div className="page-shell px-5 py-5 mb-4">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => setView('list')} className="icon-badge">
              <ChevronLeft className="w-5 h-5 text-surface-700" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="section-label mb-2">Receta</p>
              <h1 className="font-display text-[2rem] font-bold tracking-[-0.05em] text-surface-900 truncate">{selectedRecipe.name}</h1>
              {selectedRecipe.description && <p className="text-surface-500 text-xs mt-2">{selectedRecipe.description}</p>}
            </div>
            <button onClick={() => openEdit(selectedRecipe, 'detail')} className="icon-badge">
              <Edit2 className="w-4 h-4 text-surface-700" />
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {/* Nutrition card */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-surface-500 uppercase">
                {selectedRecipe.total_servings > 1 ? `Por porción (1 de ${selectedRecipe.total_servings})` : 'Totales'}
              </span>
              {selectedRecipe.total_servings > 1 && (
                <span className="text-xs text-surface-400">Total: {totals.calories} kcal</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Calorías', val: `${perServing.calories}`, unit: 'kcal', color: 'text-surface-900', bg: 'bg-surface-50' },
                { label: 'Proteína', val: `${perServing.protein_g}`, unit: 'g', color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Carbos',   val: `${perServing.carbs_g}`,   unit: 'g', color: 'text-amber-600', bg: 'bg-amber-50' },
                { label: 'Grasa',    val: `${perServing.fat_g}`,     unit: 'g', color: 'text-purple-600', bg: 'bg-purple-50' },
              ].map(m => (
                <div key={m.label} className={`${m.bg} rounded-xl p-2 text-center`}>
                  <p className={`font-bold text-sm font-mono ${m.color}`}>{m.val}<span className="text-[10px] font-normal">{m.unit}</span></p>
                  <p className="text-[10px] text-surface-400 mt-0.5">{m.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Ingredients */}
          <div className="card overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-50">
              <span className="font-semibold text-surface-800 text-sm">{selectedRecipe.ingredients.length} ingredientes</span>
            </div>
            {selectedRecipe.ingredients.map(ing => (
              <div key={ing.id} className="flex items-center gap-3 px-4 py-3 border-b border-surface-50 last:border-0">
                {ing.image_url
                  ? <img src={ing.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100 flex-shrink-0" />
                  : <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center flex-shrink-0"><Leaf className="w-4 h-4 text-brand-300" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-800 truncate">{ing.food_name}</p>
                  <p className="text-xs text-surface-400">{ing.brand ? `${ing.brand} · ` : ''}{ing.serving_size_g}g</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold font-mono">{Math.round(ing.calories_per_100g * ing.serving_size_g / 100)}</p>
                  <p className="text-[10px] text-surface-400">kcal</p>
                </div>
              </div>
            ))}
          </div>

          {/* Log button */}
          <button
            onClick={() => setLogDialog({ recipe: selectedRecipe, mealType: 'lunch', servings: '1' })}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Añadir al diario
          </button>
        </div>

        {logDialog && <LogDialogModal />}
      </div>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  return (
    <div className="pb-[calc(8rem+env(safe-area-inset-bottom))] px-4 pt-6">
      <div className="page-shell px-5 py-5 mb-4">
        <div className="flex items-center gap-3 mb-1">
          <button onClick={onBack} className="icon-badge">
            <ChevronLeft className="w-5 h-5 text-surface-700" />
          </button>
          <div>
            <p className="section-label mb-2">Recetas</p>
            <h1 className="font-display text-[2rem] font-bold tracking-[-0.05em] text-surface-900">Mis recetas</h1>
          </div>
        </div>
        <p className="relative z-10 text-surface-500 text-sm ml-11">Varios alimentos al diario de un solo toque</p>
      </div>

      {logSuccess && (
        <div className="card text-green-700 text-sm px-4 py-3 mb-4 flex items-center gap-2">
          <Check className="w-4 h-4" />{logSuccess}
        </div>
      )}

      <div className="mb-4">
        <button
          onClick={() => {
            if (!isPro && recipes.length >= FREE_RECIPE_LIMIT) {
              setShowProModal(true);
            } else {
              openCreate();
            }
          }}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          {!isPro && recipes.length >= FREE_RECIPE_LIMIT ? '🔒 Nueva receta — Pro' : 'Nueva receta'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : recipes.length === 0 ? (
        <div className="text-center py-16 px-8">
          <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <ChefHat className="w-8 h-8 text-brand-300" />
          </div>
          <p className="text-surface-600 font-medium">Aún no tienes recetas</p>
          <p className="text-sm text-surface-400 mt-1">Crea tu primera receta para añadir varios alimentos al diario de un toque</p>
        </div>
      ) : (
        <div className="space-y-3">
          {recipes.map(recipe => {
            const t = computeRecipeNutrients(recipe.ingredients, 1 / recipe.total_servings);
            return (
              <div key={recipe.id} className="card overflow-hidden">
                <button onClick={() => { setSelectedRecipe(recipe); setView('detail'); }}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-surface-50 transition-colors">
                  <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <ChefHat className="w-6 h-6 text-brand-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-surface-900 truncate">{recipe.name}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-surface-400">{recipe.ingredients.length} ingredientes</span>
                      {recipe.total_servings > 1 && (
                        <><span className="text-surface-200">·</span>
                        <span className="text-xs text-surface-400 flex items-center gap-0.5">
                          <Users className="w-3 h-3" /> {recipe.total_servings} porciones
                        </span></>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-surface-900 font-mono">{t.calories}</p>
                    <p className="text-[10px] text-surface-400">kcal{recipe.total_servings > 1 ? '/porc.' : ''}</p>
                  </div>
                </button>
                <div className="flex border-t border-surface-50">
                  <button onClick={() => openEdit(recipe)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-surface-500 hover:bg-surface-50 transition-colors">
                    <Edit2 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <div className="w-px bg-surface-100" />
                  <button onClick={() => setLogDialog({ recipe, mealType: 'lunch', servings: '1' })}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs text-brand-600 font-semibold hover:bg-brand-50 transition-colors">
                    <Plus className="w-3.5 h-3.5" /> Añadir al diario
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {logDialog && <LogDialogModal />}
      {showProModal && <ProModal onClose={() => setShowProModal(false)} />}
    </div>
  );
}
