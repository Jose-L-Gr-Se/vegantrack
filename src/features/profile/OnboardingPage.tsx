import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { calculateTargets } from '@/utils/nutrition';
import { Spinner } from '@/components/ui/Spinner';
import { Leaf, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import type { Profile } from '@/types';

const STEPS = ['Datos básicos', 'Actividad', 'Objetivo'];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentario', desc: 'Trabajo de oficina, sin ejercicio' },
  { value: 'light', label: 'Ligero', desc: '1-2 días de ejercicio/semana' },
  { value: 'moderate', label: 'Moderado', desc: '3-4 días de ejercicio/semana' },
  { value: 'active', label: 'Activo', desc: '5-6 días de ejercicio/semana' },
  { value: 'very_active', label: 'Muy activo', desc: 'Ejercicio intenso diario' },
] as const;

const GOAL_OPTIONS = [
  { value: 'cut', label: 'Perder grasa', desc: '-500 kcal/día', emoji: '🔥' },
  { value: 'maintain', label: 'Mantener', desc: 'Mantenimiento', emoji: '⚖️' },
  { value: 'bulk', label: 'Ganar masa', desc: '+300 kcal/día', emoji: '💪' },
] as const;

export function OnboardingPage() {
  const { updateProfile, loading } = useAuthStore();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Partial<Profile>>({
    display_name: '',
    height_cm: undefined,
    weight_kg: undefined,
    birth_date: '',
    sex: null,
    activity_level: 'moderate',
    goal: 'maintain',
  });

  const update = (data: Partial<Profile>) => setForm((prev) => ({ ...prev, ...data }));

  const canProceed = () => {
    if (step === 0) return form.display_name && form.height_cm && form.weight_kg && form.birth_date && form.sex;
    if (step === 1) return form.activity_level;
    if (step === 2) return form.goal;
    return false;
  };

  const handleFinish = async () => {
    const targets = calculateTargets(form);
    if (!targets) return;

    await updateProfile({
      ...form,
      calorie_target: targets.calories,
      protein_target_g: targets.protein_g,
      carbs_target_g: targets.carbs_g,
      fat_target_g: targets.fat_g,
    });
  };

  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white px-6 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-600 rounded-2xl mb-3">
          <Leaf className="w-6 h-6 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-2xl font-bold text-surface-900">Configurar perfil</h1>
        <p className="text-surface-500 text-sm mt-1">{STEPS[step]}</p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2 mb-8 max-w-sm mx-auto">
        {STEPS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= step ? 'bg-brand-500' : 'bg-surface-200'
            }`}
          />
        ))}
      </div>

      <div className="max-w-sm mx-auto">
        {/* Step 0: Basic data */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="label">Nombre</label>
              <input
                type="text"
                value={form.display_name || ''}
                onChange={(e) => update({ display_name: e.target.value })}
                className="input"
                placeholder="Tu nombre"
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
                  placeholder="175"
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
                  placeholder="72"
                />
              </div>
            </div>

            <div>
              <label className="label">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.birth_date || ''}
                onChange={(e) => update({ birth_date: e.target.value })}
                className="input"
              />
            </div>

            <div>
              <label className="label">Sexo biológico</label>
              <div className="grid grid-cols-2 gap-3">
                {(['male', 'female'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => update({ sex: s })}
                    className={`py-3 rounded-2xl text-sm font-semibold border-2 transition-all ${
                      form.sex === s
                        ? 'border-brand-500 bg-brand-50 text-brand-700'
                        : 'border-surface-200 text-surface-500 hover:border-surface-300'
                    }`}
                  >
                    {s === 'male' ? 'Masculino' : 'Femenino'}
                  </button>
                ))}
              </div>
              <p className="text-xs text-surface-400 mt-1.5">Se usa solo para calcular tu metabolismo basal</p>
            </div>
          </div>
        )}

        {/* Step 1: Activity level */}
        {step === 1 && (
          <div className="space-y-3">
            {ACTIVITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ activity_level: opt.value })}
                className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all ${
                  form.activity_level === opt.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <div className="font-semibold text-surface-900">{opt.label}</div>
                <div className="text-sm text-surface-500">{opt.desc}</div>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <div className="space-y-3">
            {GOAL_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => update({ goal: opt.value })}
                className={`w-full text-left px-4 py-4 rounded-2xl border-2 transition-all ${
                  form.goal === opt.value
                    ? 'border-brand-500 bg-brand-50'
                    : 'border-surface-200 hover:border-surface-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.emoji}</span>
                  <div>
                    <div className="font-semibold text-surface-900">{opt.label}</div>
                    <div className="text-sm text-surface-500">{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}

            {/* Preview targets */}
            {(() => {
              const targets = calculateTargets(form);
              if (!targets) return null;
              return (
                <div className="card p-4 mt-6">
                  <p className="text-sm font-semibold text-surface-600 mb-3">Tus objetivos calculados:</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-brand-600">{targets.calories}</div>
                      <div className="text-xs text-surface-500">kcal/día</div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-blue-600">{targets.protein_g}g</div>
                      <div className="text-xs text-surface-500">proteína</div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-amber-600">{targets.carbs_g}g</div>
                      <div className="text-xs text-surface-500">carbos</div>
                    </div>
                    <div className="text-center">
                      <div className="font-display text-2xl font-bold text-rose-600">{targets.fat_g}g</div>
                      <div className="text-xs text-surface-500">grasas</div>
                    </div>
                  </div>
                  <p className="text-xs text-surface-400 mt-3 text-center">
                    Proteína: 1.8g/kg (ajustada para dieta plant-based)
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="btn-secondary flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Atrás
            </button>
          )}
          <button
            onClick={step < 2 ? () => setStep(step + 1) : handleFinish}
            disabled={!canProceed() || loading}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Spinner className="text-white" />
            ) : step < 2 ? (
              <>Siguiente <ArrowRight className="w-4 h-4" /></>
            ) : (
              <>Empezar <Check className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
