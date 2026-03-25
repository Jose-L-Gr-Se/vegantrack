import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCustomFoodStore } from '@/stores/customFoodStore';
import { calculateTargets } from '@/utils/nutrition';
import { CustomFoodModal } from '@/features/search/CustomFoodModal';
import { Spinner } from '@/components/ui/Spinner';
import { LogOut, Save, User, Calculator, Star, Pencil, Trash2, Plus } from 'lucide-react';
import type { Profile, CustomFood } from '@/types';

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

export function ProfilePage() {
  const { profile, user, updateProfile, signOut, loading } = useAuthStore();
  const { customFoods, fetchCustomFoods, deleteCustomFood } = useCustomFoodStore();
  const [form, setForm] = useState<Partial<Profile>>({ ...profile });
  const [saved, setSaved] = useState(false);
  const [editingFood, setEditingFood] = useState<CustomFood | null>(null);
  const [showCreateFood, setShowCreateFood] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) fetchCustomFoods(user.id);
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
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-surface-400 hover:text-brand-600 hover:bg-brand-50 transition-all"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deletingId === food.id ? (
                      <button
                        onClick={() => handleDeleteFood(food.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-red-600 bg-red-50 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setDeletingId(food.id)}
                        onBlur={() => setTimeout(() => setDeletingId(null), 2000)}
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
