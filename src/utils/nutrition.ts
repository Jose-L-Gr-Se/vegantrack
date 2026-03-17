import type { Profile } from '@/types';

const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

const GOAL_ADJUSTMENTS = {
  cut: -500,
  maintain: 0,
  bulk: 300,
} as const;

/**
 * Calculate BMR using Mifflin-St Jeor equation
 * More accurate than Harris-Benedict for modern populations
 */
function calculateBMR(weightKg: number, heightCm: number, ageYears: number, sex: 'male' | 'female'): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === 'male' ? base + 5 : base - 161;
}

function getAge(birthDate: string): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export function calculateTDEE(profile: Partial<Profile>): number | null {
  const { weight_kg, height_cm, birth_date, sex, activity_level } = profile;
  if (!weight_kg || !height_cm || !birth_date || !sex || !activity_level) return null;

  const age = getAge(birth_date);
  const bmr = calculateBMR(weight_kg, height_cm, age, sex);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity_level]);
}

export function calculateTargets(profile: Partial<Profile>): {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
} | null {
  const tdee = calculateTDEE(profile);
  if (!tdee || !profile.goal || !profile.weight_kg) return null;

  const calories = tdee + GOAL_ADJUSTMENTS[profile.goal];

  // Protein: 1.8g/kg for active vegans (higher to account for plant protein digestibility)
  const protein_g = Math.round(profile.weight_kg * 1.8);
  // Fat: 25% of calories
  const fat_g = Math.round((calories * 0.25) / 9);
  // Carbs: remaining calories
  const carbs_g = Math.round((calories - protein_g * 4 - fat_g * 9) / 4);

  return { calories: Math.round(calories), protein_g, carbs_g, fat_g };
}

export function formatNumber(n: number): string {
  return n.toLocaleString('es-ES');
}
