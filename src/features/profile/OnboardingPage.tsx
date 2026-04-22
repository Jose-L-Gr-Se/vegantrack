import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { calculateTargets } from '@/utils/nutrition';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';
import type { Profile } from '@/types';

const STEPS = ['Datos basicos', 'Actividad', 'Objetivo'];

const ACTIVITY_OPTIONS = [
  { value: 'sedentary', label: 'Sedentario', desc: 'Trabajo de oficina, sin ejercicio' },
  { value: 'light', label: 'Ligero', desc: '1-2 dias de ejercicio/semana' },
  { value: 'moderate', label: 'Moderado', desc: '3-4 dias de ejercicio/semana' },
  { value: 'active', label: 'Activo', desc: '5-6 dias de ejercicio/semana' },
  { value: 'very_active', label: 'Muy activo', desc: 'Ejercicio intenso diario' },
] as const;

const GOAL_OPTIONS = [
  { value: 'cut', label: 'Perder grasa', desc: '-500 kcal/dia', emoji: '🔥' },
  { value: 'maintain', label: 'Mantener', desc: 'Mantenimiento', emoji: '⚖️' },
  { value: 'bulk', label: 'Ganar masa', desc: '+300 kcal/dia', emoji: '💪' },
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

  const targets = calculateTargets(form);

  return (
    <div className="min-h-dvh px-4 py-6">
      <div className="max-w-lg mx-auto space-y-5">
        <section className="page-shell px-6 py-6">
          <div className="relative z-10">
            <AppLogo className="w-12 h-12 mb-5 rounded-[1.35rem] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)]" />
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <p className="section-label mb-2">Setup</p>
                <h1 className="font-display text-[2.2rem] leading-[0.95] tracking-[-0.05em] text-surface-900">
                  Configura tu perfil una sola vez.
                </h1>
              </div>
              <span className="status-pill whitespace-nowrap">
                Paso {step + 1} / {STEPS.length}
              </span>
            </div>
            <p className="text-surface-500 text-sm leading-relaxed mb-5">
              {STEPS[step]}. Mantendremos intacta la experiencia diaria, pero con objetivos mejor calculados desde el primer minuto.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {STEPS.map((item, index) => (
                <div key={item} className="space-y-2">
                  <div className={`h-1.5 rounded-full transition-all ${index <= step ? 'bg-brand-500' : 'bg-surface-200'}`} />
                  <p className={`text-[11px] uppercase tracking-[0.16em] ${index === step ? 'text-surface-700 font-semibold' : 'text-surface-400'}`}>
                    {item}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="card p-5">
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
                <label className="label">Sexo biologico</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['male', 'female'] as const).map((sex) => (
                    <button
                      key={sex}
                      type="button"
                      onClick={() => update({ sex })}
                      className={`rounded-2xl border-2 py-3 text-sm font-semibold transition-all ${
                        form.sex === sex
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-surface-200 text-surface-500 hover:border-surface-300'
                      }`}
                    >
                      {sex === 'male' ? 'Masculino' : 'Femenino'}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-surface-400 mt-2">Se usa solo para calcular tu metabolismo basal.</p>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-3">
              {ACTIVITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update({ activity_level: option.value })}
                  className={`w-full rounded-[1.5rem] border-2 px-4 py-4 text-left transition-all ${
                    form.activity_level === option.value
                      ? 'border-brand-500 bg-brand-50'
                      : 'border-surface-200 hover:border-surface-300'
                  }`}
                >
                  <div className="font-semibold text-surface-900">{option.label}</div>
                  <div className="text-sm text-surface-500 mt-1">{option.desc}</div>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-3">
                {GOAL_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => update({ goal: option.value })}
                    className={`w-full rounded-[1.5rem] border-2 px-4 py-4 text-left transition-all ${
                      form.goal === option.value
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-surface-200 hover:border-surface-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{option.emoji}</span>
                      <div>
                        <div className="font-semibold text-surface-900">{option.label}</div>
                        <div className="text-sm text-surface-500 mt-1">{option.desc}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {targets && (
                <div className="page-shell px-4 py-4">
                  <div className="relative z-10">
                    <p className="section-label mb-3">Objetivos calculados</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="metric-tile text-center">
                        <div className="font-display text-2xl font-bold text-brand-700">{targets.calories}</div>
                        <div className="text-xs text-surface-500 mt-1">kcal/dia</div>
                      </div>
                      <div className="metric-tile text-center">
                        <div className="font-display text-2xl font-bold text-blue-600">{targets.protein_g}g</div>
                        <div className="text-xs text-surface-500 mt-1">proteina</div>
                      </div>
                      <div className="metric-tile text-center">
                        <div className="font-display text-2xl font-bold text-amber-600">{targets.carbs_g}g</div>
                        <div className="text-xs text-surface-500 mt-1">carbos</div>
                      </div>
                      <div className="metric-tile text-center">
                        <div className="font-display text-2xl font-bold text-purple-600">{targets.fat_g}g</div>
                        <div className="text-xs text-surface-500 mt-1">grasas</div>
                      </div>
                    </div>
                    <p className="text-xs text-surface-400 mt-3 text-center">
                      Proteina ajustada para una dieta plant-based.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(step - 1)} className="btn-secondary flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Atras
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
