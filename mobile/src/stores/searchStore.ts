import { create } from 'zustand';
import { searchProducts, getProductByBarcode } from '@/services/openfoodfacts';
import { supabase } from '@/services/supabase';
import type { OpenFoodFactsProduct, FoodLogEntry, MealType } from '@/types';

interface SearchState {
  query: string;
  results: OpenFoodFactsProduct[];
  loading: boolean;
  barcodeLoading: boolean;
  error: string | null;
  addingEntry: boolean;

  setQuery: (q: string) => void;
  search: (query: string) => Promise<void>;
  scanBarcode: (barcode: string) => Promise<OpenFoodFactsProduct | null>;
  addToLog: (params: AddToLogParams) => Promise<{ error: string | null }>;
  clear: () => void;
}

interface AddToLogParams {
  product: OpenFoodFactsProduct;
  userId: string;
  date: string;
  mealType: MealType;
  servingGrams: number;
}

function scale(per100g: number, grams: number): number {
  return (per100g * grams) / 100;
}

function scaleOrNull(per100g: number | null | undefined, grams: number): number | null {
  if (per100g == null) return null;
  return (per100g * grams) / 100;
}

function buildLogEntry(
  p: OpenFoodFactsProduct,
  userId: string,
  date: string,
  mealType: MealType,
  grams: number
): Omit<FoodLogEntry, 'id' | 'created_at' | 'updated_at'> {
  const n = p.nutriments;
  return {
    user_id: userId,
    date,
    meal_type: mealType,
    food_name: p.product_name,
    barcode: p.code || null,
    brand: p.brands || null,
    serving_size_g: grams,
    calories: Math.round(scale(n['energy-kcal_100g'], grams)),
    protein_g: Math.round(scale(n.proteins_100g, grams) * 10) / 10,
    carbs_g: Math.round(scale(n.carbohydrates_100g, grams) * 10) / 10,
    fat_g: Math.round(scale(n.fat_100g, grams) * 10) / 10,
    fiber_g: Math.round(scale(n.fiber_100g, grams) * 10) / 10,
    sugar_g: Math.round(scale(n.sugars_100g, grams) * 10) / 10,
    saturated_fat_g: Math.round(scale(n['saturated-fat_100g'], grams) * 10) / 10,
    sodium_mg: Math.round(scale(n.sodium_100g * 1000, grams)),
    // Micros — null if not reported by the product
    vitamin_b12_mcg: scaleOrNull(n['vitamin-b12_100g'], grams),
    iron_mg: scaleOrNull(n['iron_100g'], grams),
    zinc_mg: scaleOrNull(n['zinc_100g'], grams),
    calcium_mg: scaleOrNull(n['calcium_100g'], grams),
    omega3_g: null,
    vitamin_d_mcg: scaleOrNull(n['vitamin-d_100g'], grams),
    // Known flags — true only if the product actually reported that micro
    vitamin_b12_known: n['vitamin-b12_100g'] != null,
    iron_known: n['iron_100g'] != null,
    zinc_known: n['zinc_100g'] != null,
    calcium_known: n['calcium_100g'] != null,
    omega3_known: false,
    vitamin_d_known: n['vitamin-d_100g'] != null,
    source: 'openfoodfacts',
    source_ref: p.code || null,
    is_vegan: false,
    image_url: p.image_front_url || null,
  };
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  results: [],
  loading: false,
  barcodeLoading: false,
  error: null,
  addingEntry: false,

  setQuery: (q) => set({ query: q }),

  search: async (query) => {
    if (!query.trim()) {
      set({ results: [], error: null });
      return;
    }
    set({ loading: true, error: null });
    const { products } = await searchProducts(query.trim());
    set({ results: products, loading: false });
  },

  scanBarcode: async (barcode) => {
    set({ barcodeLoading: true, error: null });
    const product = await getProductByBarcode(barcode);
    set({ barcodeLoading: false });
    if (!product) set({ error: 'Producto no encontrado' });
    return product;
  },

  addToLog: async ({ product, userId, date, mealType, servingGrams }) => {
    set({ addingEntry: true });
    const entry = buildLogEntry(product, userId, date, mealType, servingGrams);
    const { error } = await supabase.from('food_log').insert(entry);
    set({ addingEntry: false });
    if (error) return { error: error.message };
    return { error: null };
  },

  clear: () => set({ query: '', results: [], error: null }),
}));
