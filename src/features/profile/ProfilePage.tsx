import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { calculateTargets } from '@/utils/nutrition';
import { CustomFoodModal } from '@/features/search/CustomFoodModal';
import { Spinner } from '@/components/ui/Spinner';
import { LogOut, Save, User, Calculator, Star, Pencil, Trash2, Plus, Moon, Sun, X } from 'lucide-react';
import type { Profile, CustomFood, SupplementNutrientKey } from '@/types';
import { useSupplementStore } from '@/stores/supplementStore';

const NUTRIENT_ICONS: Record<string, string> = {
  vitamin_b12_mcg: '🧬', vitamin_d_mcg: '☀️', omega3_g: '🌊',
  iron_mg: '🩸', zinc_mg: '⚡', calcium_mg: '🦴', iodine_mcg: '💧',
};

const SUPPLEMENT_PRESETS: Array<{
  name: string; nutrient_key: SupplementNutrientKey;
  dose_amount: number; dose_unit: string;
}> = [
  { name: 'Vitamina B12',    nutrient_key: 'vitamin_b12_mcg', dose_amount: 100,  dose_unit: 'μg' },
  { name: 'Vitamina D3',     nutrient_key: 'vitamin_d_mcg',   dose_amount: 25,   dose_unit: 'μg' },
  { name: 'Omega-3 DHA+EPA', nutrient_key: 'omega3_g',        dose_amount: 0.5,  dose_unit: 'g'  },
  { name: 'Hierro',          nutrient_key: 'iron_mg',          dose_amount: 18,   dose_unit: 'mg' },
  { name: 'Zinc',            nutrient_key: 'zinc_mg',          dose_amount: 15,   dose_unit: 'mg' },
  { name: 'Calcio',          nutrient_key: 'calcium_mg',       dose_amount: 500,  dose_unit: 'mg' },
  { name: 'Yodo',            nutrient_key: 'iodine_mcg',       dose_amount: 150,  dose_unit: 'μg' },
];

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: 'Sedentario',
  light: 'Ligero',
  moderate: 'Moderado',
  active: 'Activo',
  very_active: 'Muy activo',
};

const GOAL_LABELS: Record<string, string> = {
  cut: 'Perder grasa',
  maintain: 'Mantener',
  bulk: 'Ganar masa',
};

interface ProfilePageProps {
  isDark: boolean;
  onToggleDark: () => void;
}

export function ProfilePage({ isDark, onToggleDark }: ProfilePageProps) {
  const { profile, user, updateProfile, signOut, loading } = useAuthStore();
  const { customFoods, fetchCustomFoods, deleteCustomFood } = useCustomFoodStore();
  const { supplements, fetchSupplements, createSupplement, updateSupplement, deleteSupplement } =
    useSupplementStore();
  const [form, setForm] = useState<Partial<Profile>>({ ...profile });
  const [saved, setSaved] = useState(false);
  const [editingFood, setEditingFood] = useState<CustomFood | null>(null);
  const [showCreateFood, setShowCreateFood] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddSupplement, setShowAddSupplement] = useState(false);
  const [editingDose, setEditingDose] = useState<string | null>(null);
  const [doseInput, setDoseInput] = useState('');

  useEffect(() => {
    if (user) fetchCustomFoods(user.id);
  }, [user?.id]);

  useEffect(() => {
    if (user) fetchSupplements(user.id);
  }, [user?.id]);

  if (!profile) return null;

  const update = (data: Partial<Profile>) => {
    setForm((prev) => ({ ...prev, ...data }));
    setSaved(false);
  };

  const handleRecalculate = () => {
    const targets = calculateTargets(form);
    if (targets) {
      update({
        calorie_target: targets.calories,
        protein_target_g: targets.protein_g,
        carbs_target_g: targets.carbs_g,
        fat_target_g: targets.fat_g,
      });
    }
  };

  const handleSave = async () => {
    const { error } = await updateProfile(form);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleDeleteFood = async (id: string) => {
    await deleteCustomFood(id);
    setDeletingId(null);
  };

  return (
    <div className="pb-28 px-4 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold">Perfil</h1>
          <p className="text-sm text-surface-500">{profile.display_name || 'Sin nombre'}</p>
        </div>
        <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
          <User className="w-6 h-6 text-brand-600" />
        </div>
      </div>

      <div className="space-y-4">
        {/* My custom foods */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Mis alimentos</h2>
              <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {customFoods.length}
              </span>
            </div>
            <button
              onClick={() => setShowCreateFood(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Nuevo
            </button>
          </div>

          {customFoods.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Star className="w-5 h-5 text-amber-300" />
              </div>
              <p className="text-sm text-surface-500">No tienes alimentos personalizados</p>
              <p className="text-xs text-surface-400 mt-1">Crea uno desde la pestaña de búsqueda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {customFoods.map((food) => (
                <div key={food.id} className="flex items-center gap-3 bg-surface-50 rounded-2xl p-3">
                  {food.image_url ? (
                    <img src={food.image_url} alt="" className="w-10 h-10 rounded-xl object-cover bg-surface-100" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Star className="w-4 h-4 text-amber-300" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{food.name}</p>
                    <p className="text-xs text-surface-400">
                      {food.brand || 'Sin marca'} · <span className="font-mono">{food.calories_per_100g}</span> kcal/100g
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setEditingFood(food)}
                      aria-label={`Editar ${food.name}`}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === food.id ? (
                      <button
                        onClick={() => handleDeleteFood(food.id)}
                        aria-label="Confirmar eliminación"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-red-600 bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeletingId(food.id)}
                        onBlur={() => setTimeout(() => setDeletingId(null), 2000)}
                        aria-label="Eliminar"
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-surface-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Edit/Create food modal */}
        {(editingFood || showCreateFood) && (
          <CustomFoodModal
            editFood={editingFood}
            onClose={() => { setEditingFood(null); setShowCreateFood(false); }}
            onSaved={() => {
              setEditingFood(null);
              setShowCreateFood(false);
              if (user) fetchCustomFoods(user.id);
            }}
          />
        )}

        {/* My supplements */}
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">
                Mis suplementos
              </h2>
              <span className="bg-brand-100 text-brand-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {supplements.filter((s) => s.is_active).length} activos
              </span>
            </div>
            <button
              onClick={() => setShowAddSupplement(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-2.5 py-1.5 rounded-xl transition-colors"
            >
              <Plus className="w-3 h-3" strokeWidth={2.5} /> Añadir
            </button>
          </div>

          {supplements.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-3xl mb-2">💊</div>
              <p className="text-sm text-surface-500">Sin suplementos configurados</p>
              <p className="text-xs text-surface-400 mt-1">
                Se suman automáticamente a tus micros del dashboard
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {supplements.map((sup) => (
                <div key={sup.id} className="flex items-center gap-3 bg-surface-50 rounded-2xl p-3">
                  <span className="text-xl shrink-0">{NUTRIENT_ICONS[sup.nutrient_key] ?? '💊'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-800 truncate">{sup.name}</p>
                    {editingDose === sup.id ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          value={doseInput}
                          onChange={e => setDoseInput(e.target.value)}
                          onBlur={async () => {
                            const val = parseFloat(doseInput);
                            if (!isNaN(val) && val > 0) {
                              await updateSupplement(sup.id, { dose_amount: val });
                            }
                            setEditingDose(null);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                            if (e.key === 'Escape') setEditingDose(null);
                          }}
                          className="w-20 text-xs font-mono bg-surface-100 border border-brand-400 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-brand-500"
                          autoFocus
                        />
                        <span className="text-xs text-surface-400">{sup.dose_unit}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingDose(sup.id); setDoseInput(String(sup.dose_amount)); }}
                        className="flex items-center gap-1 mt-0.5 group"
                      >
                        <p className="text-xs text-surface-400 font-mono">
                          {sup.dose_amount} {sup.dose_unit} · {sup.frequency === 'daily' ? 'Diario' : sup.frequency}
                        </p>
                        <Pencil className="w-2.5 h-2.5 text-surface-300 group-hover:text-brand-400 transition-colors opacity-0 group-hover:opacity-100" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateSupplement(sup.id, { is_active: !sup.is_active })}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        sup.is_active ? 'bg-brand-500' : 'bg-surface-300'
                      }`}
                      aria-label={sup.is_active ? 'Desactivar' : 'Activar'}
                    >
                      <div
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                          sup.is_active ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <button
                      onClick={() => deleteSupplement(sup.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-xl text-surface-300 hover:text-red-500 hover:bg-red-50 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add supplement sheet */}
        {showAddSupplement && (
          <div
            className="fixed inset-0 z-[60] bg-black/50 flex flex-col justify-end"
            onClick={() => setShowAddSupplement(false)}
          >
            <div
              className="bg-white dark:bg-surface-800 rounded-t-3xl pb-10"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-surface-300 rounded-full" />
              </div>
              <div className="px-5 pt-2 pb-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-surface-900">Añadir suplemento</h3>
                  <button
                    onClick={() => setShowAddSupplement(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100"
                  >
                    <X className="w-4 h-4 text-surface-500" />
                  </button>
                </div>
                <p className="text-xs text-surface-400 mb-3">
                  Toca un suplemento para añadirlo con la dosis habitual. Edítala después si necesitas ajustarla.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SUPPLEMENT_PRESETS.map((preset) => {
                    const alreadyAdded = supplements.some(
                      (s) => s.nutrient_key === preset.nutrient_key
                    );
                    return (
                      <button
                        key={preset.nutrient_key}
                        disabled={alreadyAdded}
                        onClick={async () => {
                          if (!user || alreadyAdded) return;
                          await createSupplement(user.id, {
                            name: preset.name,
                            nutrient_key: preset.nutrient_key,
                            dose_amount: preset.dose_amount,
                            dose_unit: preset.dose_unit,
                          });
                          setShowAddSupplement(false);
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl text-left transition-colors ${
                          alreadyAdded
                            ? 'bg-surface-50 opacity-40 cursor-not-allowed'
                            : 'bg-surface-50 hover:bg-brand-50 active:scale-95'
                        }`}
                      >
                        <span className="text-2xl">{NUTRIENT_ICONS[preset.nutrient_key]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-surface-800 truncate">
                            {preset.name}
                          </p>
                          <p className="text-xs text-surface-400 font-mono">
                            {preset.dose_amount} {preset.dose_unit}/día
                          </p>
                        </div>
                        {alreadyAdded && (
                          <span className="ml-auto text-[10px] text-brand-500 font-semibold shrink-0">✓</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Basic info */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Datos básicos</h2>

          <div>
            <label className="label">Nombre</label>
            <input
              type="text"
              value={form.display_name || ''}
              onChange={(e) => update({ display_name: e.target.value })}
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Altura (cm)</label>
              <input
                type="number"
                value={form.height_cm || ''}
                onChange={(e) => update({ height_cm: +e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Peso (kg)</label>
              <input
                type="number"
                step="0.1"
                value={form.weight_kg || ''}
                onChange={(e) => update({ weight_kg: +e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div>
            <label className="label">Sexo biológico</label>
            <div className="grid grid-cols-2 gap-3">
              {(['male', 'female'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => update({ sex: s })}
                  className={`py-2.5 rounded-2xl text-sm font-semibold border-2 transition-all ${
                    form.sex === s
                      ? 'border-brand-500 bg-brand-50 text-brand-700'
                      : 'border-surface-200 text-surface-500'
                  }`}
                >
                  {s === 'male' ? 'Masculino' : 'Femenino'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Activity & Goal */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Actividad y objetivo</h2>

          <div>
            <label className="label">Nivel de actividad</label>
            <select
              value={form.activity_level || 'moderate'}
              onChange={(e) => update({ activity_level: e.target.value as Profile['activity_level'] })}
              className="input"
            >
              {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Objetivo</label>
            <select
              value={form.goal || 'maintain'}
              onChange={(e) => update({ goal: e.target.value as Profile['goal'] })}
              className="input"
            >
              {Object.entries(GOAL_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <button onClick={handleRecalculate} className="btn-secondary w-full flex items-center justify-center gap-2">
            <Calculator className="w-4 h-4" /> Recalcular objetivos
          </button>
        </div>

        {/* Targets */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-surface-700 text-sm uppercase tracking-wide">Objetivos diarios</h2>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Calorías (kcal)</label>
              <input
                type="number"
                value={form.calorie_target || ''}
                onChange={(e) => update({ calorie_target: +e.target.value })}
                className="input font-mono"
              />
            </div>
            <div>
              <label className="label">Proteína (g)</label>
              <input
                type="number"
                value={form.protein_target_g || ''}
                onChange={(e) => update({ protein_target_g: +e.target.value })}
                className="input font-mono"
              />
            </div>
            <div>
              <label className="label">Carbohidratos (g)</label>
              <input
                type="number"
                value={form.carbs_target_g || ''}
                onChange={(e) => update({ carbs_target_g: +e.target.value })}
                className="input font-mono"
              />
            </div>
            <div>
              <label className="label">Grasas (g)</label>
              <input
                type="number"
                value={form.fat_target_g || ''}
                onChange={(e) => update({ fat_target_g: +e.target.value })}
                className="input font-mono"
              />
            </div>
          </div>

          <p className="text-xs text-surface-400">
            Puedes ajustar manualmente o usar el botón de recalcular arriba
          </p>
        </div>

        {/* Dark mode toggle */}
        <div className="card overflow-hidden">
          <button
            onClick={onToggleDark}
            className="flex items-center justify-between w-full px-4 py-3.5 hover:bg-surface-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              {isDark
                ? <Moon className="w-5 h-5 text-brand-500" />
                : <Sun className="w-5 h-5 text-brand-500" />
              }
              <div className="text-left">
                <p className="text-sm font-semibold text-surface-800">Modo oscuro</p>
                <p className="text-xs text-surface-400">{isDark ? 'Activado' : 'Desactivado'}</p>
              </div>
            </div>
            <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isDark ? 'bg-brand-600' : 'bg-surface-300'}`}>
              <div
                className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-transform duration-200 ${isDark ? 'translate-x-5' : 'translate-x-0.5'}`}
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>
          </button>
        </div>

        {/* Actions */}
        <button
          onClick={handleSave}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? <Spinner className="text-white" /> : saved ? (
            <><Check className="w-4 h-4" /> Guardado</>
          ) : (
            <><Save className="w-4 h-4" /> Guardar cambios</>
          )}
        </button>

        <button
          onClick={signOut}
          className="w-full py-3 text-red-500 font-medium flex items-center justify-center gap-2 hover:bg-red-50 rounded-2xl transition-colors"
        >
          <LogOut className="w-4 h-4" /> Cerrar sesión
        </button>
      </div>
    </div>
  );
}

function Check(props: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
