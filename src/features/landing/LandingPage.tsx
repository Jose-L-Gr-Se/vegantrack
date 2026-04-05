import { Leaf, ScanBarcode, BarChart3, Zap, ArrowRight, Download } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

const FEATURES = [
  {
    icon: ScanBarcode,
    title: 'Escaneo inmediato',
    desc: 'Codigo de barras, macros y micronutrientes en segundos.',
  },
  {
    icon: Zap,
    title: 'Seguimiento clave',
    desc: 'B12, hierro, zinc, calcio y vitamina D siempre a la vista.',
  },
  {
    icon: BarChart3,
    title: 'Decisiones con datos',
    desc: 'Analiza tendencias y ajusta tu alimentacion sin perder tiempo.',
  },
];

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-dvh px-4 pt-6 pb-10">
      <div className="max-w-lg mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="icon-badge bg-brand-600 text-white border-0">
              <Leaf className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <p className="section-label mb-1">Plant-Based Tracking</p>
              <span className="font-display text-xl font-bold tracking-[-0.04em] text-surface-900">VeganTrack</span>
            </div>
          </div>
          <button
            onClick={onEnter}
            className="status-pill hover:text-brand-700 transition-colors"
          >
            Entrar
          </button>
        </header>

        <section className="page-shell px-6 py-7 mb-5">
          <div className="relative z-10">
            <div className="status-pill mb-4">
              <Leaf className="w-3.5 h-3.5 text-brand-600" />
              Nutricion vegana, mejor presentada
            </div>
            <h1 className="font-display text-[2.8rem] leading-[0.92] tracking-[-0.06em] text-surface-900 max-w-sm">
              Una app de nutricion vegetal con tacto de producto premium.
            </h1>
            <p className="mt-4 text-base text-surface-600 leading-relaxed max-w-md">
              Escanea, registra y analiza tu alimentacion con una interfaz mas limpia, tranquila y enfocada en lo importante.
            </p>

            <div className="grid grid-cols-3 gap-3 mt-6 mb-7">
              <div className="metric-tile text-center">
                <p className="font-display text-2xl font-bold text-surface-900">0</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-surface-500 mt-1">Anuncios</p>
              </div>
              <div className="metric-tile text-center">
                <p className="font-display text-2xl font-bold text-brand-700">100%</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-surface-500 mt-1">Focus</p>
              </div>
              <div className="metric-tile text-center">
                <p className="font-display text-2xl font-bold text-surface-900">PWA</p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-surface-500 mt-1">Instalable</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={onEnter}
                className="btn-primary flex items-center justify-center gap-2 text-base"
              >
                Empezar gratis <ArrowRight className="w-5 h-5" />
              </button>

              <a
                href="https://app.vegantrack.app"
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                Instalar como app
              </a>
            </div>
          </div>
        </section>

        <section className="space-y-3 mb-6">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card p-4 flex items-start gap-4">
              <div className="icon-badge flex-shrink-0">
                <feature.icon className="w-4 h-4 text-brand-600" strokeWidth={1.8} />
              </div>
              <div>
                <p className="font-semibold text-surface-900">{feature.title}</p>
                <p className="text-sm text-surface-500 mt-1 leading-relaxed">{feature.desc}</p>
              </div>
            </div>
          ))}
        </section>

        <footer className="page-shell px-5 py-4 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-surface-400 mb-3">Datos por encima de opinion</p>
          <div className="flex items-center justify-center gap-4 text-sm text-surface-500">
            <a
              href="https://x.com/VeganoEficaz"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-surface-700 transition-colors"
            >
              @VeganoEficaz
            </a>
            <span className="text-surface-300">/</span>
            <a
              href="https://instagram.com/manual__verde"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-surface-700 transition-colors"
            >
              @manual__verde
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}
