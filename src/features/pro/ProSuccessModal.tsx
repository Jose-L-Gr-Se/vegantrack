import { Zap, Check, X } from 'lucide-react';

interface ProSuccessModalProps {
  onClose: () => void;
}

const PRO_FEATURES = [
  'Historial nutricional completo sin límite',
  'Exportación CSV para Excel y Google Sheets',
  'Análisis de tendencias de micronutrientes',
  'Soporte prioritario',
];

export function ProSuccessModal({ onClose }: ProSuccessModalProps) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center px-4">
      <div className="card w-full max-w-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-600/30">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="section-label mb-1">Bienvenido</p>
              <h2 className="font-display text-xl font-bold text-surface-900">Plan Pro activo</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-surface-100 transition-colors"
          >
            <X className="w-4 h-4 text-surface-500" />
          </button>
        </div>

        {/* Hero message */}
        <div className="page-shell p-4 text-center">
          <p className="text-3xl mb-2">🌱</p>
          <p className="text-sm text-surface-600 leading-relaxed">
            Gracias por apoyar VeganTrack. Ya tienes acceso a todas las funciones Pro.
          </p>
        </div>

        {/* Features unlocked */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider">
            Ahora tienes acceso a
          </p>
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-5 h-5 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-3 h-3 text-brand-600" strokeWidth={2.5} />
              </div>
              <span className="text-sm text-surface-700">{f}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} className="btn-primary w-full flex items-center justify-center gap-2">
          Empezar a usar Pro
        </button>
      </div>
    </div>
  );
}
