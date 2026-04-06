import { supabase } from '@/lib/supabase';

export async function exportDiaryCsv(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('No hay registros para exportar');

  const headers = [
    'Fecha',
    'Comida',
    'Alimento',
    'Marca',
    'Cantidad (g)',
    'Calorías',
    'Proteína (g)',
    'Carbos (g)',
    'Grasas (g)',
    'Fibra (g)',
    'Azúcares (g)',
    'G. saturadas (g)',
    'Sodio (mg)',
    'Vitamina B12 (μg)',
    'Hierro (mg)',
    'Zinc (mg)',
    'Calcio (mg)',
    'Vitamina D (μg)',
    'Omega-3 (g)',
    'Vegano',
  ];

  const MEAL_LABELS: Record<string, string> = {
    breakfast: 'Desayuno',
    lunch: 'Comida',
    dinner: 'Cena',
    snack: 'Snacks',
  };

  const rows = data.map((e) => [
    e.date,
    MEAL_LABELS[e.meal_type] ?? e.meal_type,
    e.food_name,
    e.brand ?? '',
    e.serving_size_g,
    Math.round(e.calories),
    e.protein_g,
    e.carbs_g,
    e.fat_g,
    e.fiber_g ?? 0,
    e.sugar_g ?? 0,
    e.saturated_fat_g ?? 0,
    e.sodium_mg ?? 0,
    e.vitamin_b12_mcg ?? '',
    e.iron_mg ?? '',
    e.zinc_mg ?? '',
    e.calcium_mg ?? '',
    e.vitamin_d_mcg ?? '',
    e.omega3_g ?? '',
    e.is_vegan ? 'Sí' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    ),
  ].join('\n');

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `vegantrack-diario-${today}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
