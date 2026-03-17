export interface Profile {
  id: string;
  display_name: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  birth_date: string | null;
  sex: 'male' | 'female' | null;
  activity_level: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  goal: 'cut' | 'maintain' | 'bulk';
  calorie_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLogEntry {
  id: string;
  user_id: string;
  date: string;
  meal_type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  food_name: string;
  barcode: string | null;
  brand: string | null;
  serving_size_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  sugar_g: number;
  saturated_fat_g: number;
  sodium_mg: number;
  is_vegan: boolean;
  image_url: string | null;
  created_at: string;
}

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands: string;
  image_front_url: string;
  categories_tags: string[];
  labels_tags: string[];
  nutriments: {
    'energy-kcal_100g': number;
    proteins_100g: number;
    carbohydrates_100g: number;
    fat_100g: number;
    fiber_100g: number;
    sugars_100g: number;
    'saturated-fat_100g': number;
    sodium_100g: number;
    [key: string]: number;
  };
  serving_size: string;
  serving_quantity: number;
}

export interface NutrientSummary {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
}

export interface MealGroup {
  type: FoodLogEntry['meal_type'];
  label: string;
  icon: string;
  entries: FoodLogEntry[];
  totals: NutrientSummary;
}

export type MealType = FoodLogEntry['meal_type'];
