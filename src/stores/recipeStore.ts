import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import type { Recipe, RecipeIngredient, RecipeNutrients, MealType } from '@/types';

export function computeRecipeNutrients(
  ingredients: RecipeIngredient[],
  scaleFactor = 1,
): RecipeNutrients {
  let total_g = 0, cal = 0, pro = 0, carbs = 0, fat = 0,
      fiber = 0, sugar = 0, satfat = 0, sodium = 0;
  let b12 = 0, iron = 0, zinc = 0, calcium = 0, vitd = 0, omega3 = 0;
  let b12All = true, ironAll = true, zincAll = true,
      calciumAll = true, vitdAll = true, omega3All = true;

  for (const ing of ingredients) {
    const r = ing.serving_size_g / 100;
    total_g   += ing.serving_size_g;
    cal       += ing.calories_per_100g        * r;
    pro       += ing.protein_per_100g         * r;
    carbs     += ing.carbs_per_100g           * r;
    fat       += ing.fat_per_100g             * r;
    fiber     += ing.fiber_per_100g           * r;
    sugar     += ing.sugar_per_100g           * r;
    satfat    += ing.saturated_fat_per_100g   * r;
    sodium    += ing.sodium_mg_per_100g       * r;

    if (ing.vitamin_b12_known && ing.vitamin_b12_mcg_per_100g !== null) b12 += ing.vitamin_b12_mcg_per_100g * r; else b12All = false;
    if (ing.iron_known    && ing.iron_mg_per_100g    !== null) iron    += ing.iron_mg_per_100g    * r; else ironAll    = false;
    if (ing.zinc_known    && ing.zinc_mg_per_100g    !== null) zinc    += ing.zinc_mg_per_100g    * r; else zincAll    = false;
    if (ing.calcium_known && ing.calcium_mg_per_100g !== null) calcium += ing.calcium_mg_per_100g * r; else calciumAll = false;
    if (ing.vitamin_d_known && ing.vitamin_d_mcg_per_100g !== null) vitd += ing.vitamin_d_mcg_per_100g * r; else vitdAll = false;
    if (ing.omega3_known  && ing.omega3_g_per_100g   !== null) omega3  += ing.omega3_g_per_100g   * r; else omega3All  = false;
  }

  const n = ingredients.length;
  return {
    total_g:          Math.round(total_g  * scaleFactor),
    calories:         Math.round(cal      * scaleFactor),
    protein_g:        Math.round(pro      * scaleFactor * 10) / 10,
    carbs_g:          Math.round(carbs    * scaleFactor * 10) / 10,
    fat_g:            Math.round(fat      * scaleFactor * 10) / 10,
    fiber_g:          Math.round(fiber    * scaleFactor * 10) / 10,
    sugar_g:          Math.round(sugar    * scaleFactor * 10) / 10,
    saturated_fat_g:  Math.round(satfat   * scaleFactor * 10) / 10,
    sodium_mg:        Math.round(sodium   * scaleFactor),
    vitamin_b12_mcg:  b12All    && n > 0 ? Math.round(b12     * scaleFactor * 100) / 100 : null,
    iron_mg:          ironAll   && n > 0 ? Math.round(iron    * scaleFactor * 10)  / 10  : null,
    zinc_mg:          zincAll   && n > 0 ? Math.round(zinc    * scaleFactor * 10)  / 10  : null,
    calcium_mg:       calciumAll&& n > 0 ? Math.round(calcium * scaleFactor * 10)  / 10  : null,
    vitamin_d_mcg:    vitdAll   && n > 0 ? Math.round(vitd    * scaleFactor * 100) / 100 : null,
    omega3_g:         omega3All && n > 0 ? Math.round(omega3  * scaleFactor * 100) / 100 : null,
    vitamin_b12_known: b12All    && n > 0,
    iron_known:        ironAll   && n > 0,
    zinc_known:        zincAll   && n > 0,
    calcium_known:     calciumAll && n > 0,
    vitamin_d_known:   vitdAll   && n > 0,
    omega3_known:      omega3All && n > 0,
  };
}

interface RecipeState {
  recipes: Recipe[];
  loading: boolean;
  fetchRecipes: (userId: string) => Promise<void>;
  createRecipe: (userId: string, name: string, description: string, total_servings: number) => Promise<Recipe | null>;
  updateRecipe: (id: string, updates: Partial<Pick<Recipe, 'name' | 'description' | 'total_servings'>>) => Promise<void>;
  deleteRecipe: (id: string) => Promise<void>;
  addIngredient: (recipeId: string, ingredient: Omit<RecipeIngredient, 'id' | 'recipe_id' | 'created_at'>) => Promise<RecipeIngredient | null>;
  removeIngredient: (ingredientId: string, recipeId: string) => Promise<void>;
  logRecipe: (userId: string, date: string, mealType: MealType, recipe: Recipe, servings: number) => Promise<{ error: string | null }>;
}

export const useRecipeStore = create<RecipeState>((set, get) => ({
  recipes: [],
  loading: false,

  fetchRecipes: async (userId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('recipes')
      .select('*, ingredients:recipe_ingredients(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error) {
      const recipes = (data ?? []).map((r: any) => ({
        ...r,
        ingredients: (r.ingredients ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order),
      })) as Recipe[];
      set({ recipes, loading: false });
    } else {
      set({ loading: false });
    }
  },

  createRecipe: async (userId, name, description, total_servings) => {
    const { data, error } = await supabase
      .from('recipes')
      .insert({ user_id: userId, name, description: description || null, total_servings })
      .select()
      .single();

    if (!error && data) {
      const recipe = { ...data, ingredients: [] } as Recipe;
      set((s) => ({ recipes: [recipe, ...s.recipes] }));
      return recipe;
    }
    return null;
  },

  updateRecipe: async (id, updates) => {
    const { data, error } = await supabase
      .from('recipes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (!error && data) {
      set((s) => ({
        recipes: s.recipes.map((r) => r.id === id ? { ...r, ...data } : r),
      }));
    }
  },

  deleteRecipe: async (id) => {
    await supabase.from('recipes').delete().eq('id', id);
    set((s) => ({ recipes: s.recipes.filter((r) => r.id !== id) }));
  },

  addIngredient: async (recipeId, ingredient) => {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert({ ...ingredient, recipe_id: recipeId })
      .select()
      .single();

    if (!error && data) {
      const newIng = data as RecipeIngredient;
      set((s) => ({
        recipes: s.recipes.map((r) =>
          r.id === recipeId ? { ...r, ingredients: [...r.ingredients, newIng] } : r
        ),
      }));
      return newIng;
    }
    return null;
  },

  removeIngredient: async (ingredientId, recipeId) => {
    await supabase.from('recipe_ingredients').delete().eq('id', ingredientId);
    set((s) => ({
      recipes: s.recipes.map((r) =>
        r.id === recipeId
          ? { ...r, ingredients: r.ingredients.filter((i) => i.id !== ingredientId) }
          : r
      ),
    }));
  },

  logRecipe: async (userId, date, mealType, recipe, servings) => {
    if (recipe.ingredients.length === 0) return { error: 'La receta no tiene ingredientes' };

    const scaleFactor = servings / recipe.total_servings;
    const t = computeRecipeNutrients(recipe.ingredients, scaleFactor);
    const serving_size_g = t.total_g > 0 ? t.total_g : 100;

    const { useDiaryStore } = await import('@/stores/diaryStore');
    return useDiaryStore.getState().addEntry({
      user_id: userId,
      date,
      meal_type: mealType,
      food_name: servings === 1 && recipe.total_servings === 1
        ? recipe.name
        : `${recipe.name} (${servings} ${recipe.total_servings > 1 ? `de ${recipe.total_servings}` : ''} porc.)`,
      barcode: null,
      brand: null,
      serving_size_g,
      calories: t.calories,
      protein_g: t.protein_g,
      carbs_g: t.carbs_g,
      fat_g: t.fat_g,
      fiber_g: t.fiber_g,
      sugar_g: t.sugar_g,
      saturated_fat_g: t.saturated_fat_g,
      sodium_mg: t.sodium_mg,
      vitamin_b12_mcg: t.vitamin_b12_mcg,
      iron_mg: t.iron_mg,
      zinc_mg: t.zinc_mg,
      calcium_mg: t.calcium_mg,
      omega3_g: t.omega3_g,
      vitamin_d_mcg: t.vitamin_d_mcg,
      vitamin_b12_known: t.vitamin_b12_known,
      iron_known: t.iron_known,
      zinc_known: t.zinc_known,
      calcium_known: t.calcium_known,
      omega3_known: t.omega3_known,
      vitamin_d_known: t.vitamin_d_known,
      source: 'recipe',
      source_ref: recipe.id,
      is_vegan: recipe.is_vegan,
      image_url: recipe.image_url,
    });
  },
}));
