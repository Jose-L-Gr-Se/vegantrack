import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { X, Check, Zap } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

interface ProModalProps {
  onClose: () => void;
}

const FEATURES_PRO = [
  'Historial completo sin límite de días',
  'Exportación CSV del diario nutricional',
  'Análisis de tendencias de micronutrientes',
  'Soporte prioritario',
];

const FEATURES_FREE = [
  'Historial de 7 días',
  'Escáner de código de barras',
  'Tracking de macros y micros',
  'Suplementos integrados',
  'VeganScore diario',
  'Recetas personalizadas',
];

export function ProModal({ onClose }: ProModalProps) {
  const { user } = useAuthStore();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('yearly');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const priceId = plan === 'monthly'
    ? import.meta.env.VITE_STRIPE_PRICE_MONTHLY
    : import.meta.env.VITE_STRIPE_PRICE_YEARLY;

  const handleUpgrade = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.id,
          email: user.email,
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('No se pudo iniciar el proceso de pago. Inténtalo de nuevo.');
      }
    } catch {
      setError('Error de conexión. Comprueba tu internet e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end justify-center"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-lg rounded-t-3xl overflow-y-auto pb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-surface-200 rounded-full" />
        </div>

        <div className="px-5 pt-2 space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <h2 className="font-display text-xl font-bold">VeganTrack Pro</h2>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100"
            >
              <X className="w-4 h-4 text-surface-500" />
            </button>
          </div>

          {/* Plan selector */}
          <div className="flex bg-surface-100 rounded-2xl p-1">
            <button
              onClick={() => setPlan('monthly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                plan === 'monthly'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500'
              }`}
            >
              Mensual
              <span className="block text-xs font-normal">4,99€/mes</span>
            </button>
            <button
              onClick={() => setPlan('yearly')}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all relative ${
                plan === 'yearly'
                  ? 'bg-white text-surface-900 shadow-sm'
                  : 'text-surface-500'
              }`}
            >
              Anual
              <span className="block text-xs font-normal">39,99€/año</span>
              <span className="absolute -top-1.5 -right-1 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                -33%
              </span>
            </button>
          </div>

          {/* Precio destacado */}
          <div className="text-center py-2">
            {plan === 'yearly' ? (
              <>
                <span className="font-display text-4xl font-bold text-brand-600">3,33€</span>
                <span className="text-surface-500 text-sm">/mes · facturado anualmente</span>
                <p className="text-xs text-surface-400 mt-1">39,99€/año · ahorras 19,89€</p>
              </>
            ) : (
              <>
                <span className="font-display text-4xl font-bold text-brand-600">4,99€</span>
                <span className="text-surface-500 text-sm">/mes</span>
              </>
            )}
          </div>

          {/* Features Pro */}
          <div className="bg-brand-50 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-semibold text-brand-700 uppercase tracking-wide mb-3">
              Con Pro además tienes
            </p>
            {FEATURES_PRO.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-brand-600 flex-shrink-0" />
                <span className="text-sm text-surface-700">{f}</span>
              </div>
            ))}
          </div>

          {/* Features Free */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
              Todo lo gratis se mantiene
            </p>
            {FEATURES_FREE.map((f) => (
              <div key={f} className="flex items-center gap-2">
                <Check className="w-4 h-4 text-surface-300 flex-shrink-0" />
                <span className="text-sm text-surface-500">{f}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleUpgrade}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base py-4"
          >
            {loading ? (
              <><Spinner className="text-white" /> Redirigiendo a pago...</>
            ) : (
              <>Empezar Pro {plan === 'yearly' ? '· 39,99€/año' : '· 4,99€/mes'}</>
            )}
          </button>

          <p className="text-center text-xs text-surface-400 pb-2">
            Pago seguro con Stripe · Cancela cuando quieras · Sin permanencia
          </p>
        </div>
      </div>
    </div>
  );
}
