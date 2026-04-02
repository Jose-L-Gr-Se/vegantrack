// src/features/landing/LandingPage.tsx
import { Leaf, ScanBarcode, BarChart3, Zap, ArrowRight, Download } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-brand-50 via-white to-white flex flex-col">

      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-8 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
            <Leaf className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-bold text-surface-900">VeganTrack</span>
        </div>
        <button
          onClick={onEnter}
          className="text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Entrar
        </button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-600 rounded-3xl mb-6 shadow-xl shadow-brand-600/25">
          <Leaf className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>

        <h1 className="font-display text-4xl font-bold text-surface-900 leading-tight mb-4">
          Tu nutrición<br />
          <span className="text-brand-600">plant-based</span>,<br />
          bajo control
        </h1>

        <p className="text-surface-500 text-lg max-w-xs mb-8">
          Escanea, registra y analiza tu alimentación vegana. Sin anuncios. Sin suscripciones.
        </p>

        <button
          onClick={onEnter}
          className="btn-primary flex items-center gap-2 text-base px-8 py-4 mb-4"
        >
          Empezar gratis <ArrowRight className="w-5 h-5" />
        </button>

        <a
          href="https://app.vegantrack.app"
          className="text-sm text-surface-400 flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          Instalar como app (PWA)
        </a>
      </section>

      {/* Features */}
      <section className="px-6 pb-12">
        <div className="grid gap-4 max-w-sm mx-auto">
          {[
            {
              icon: ScanBarcode,
              color: 'bg-blue-50 text-blue-600',
              title: 'Escanea cualquier producto',
              desc: 'Código de barras → macros y micros al instante. Base de datos OpenFoodFacts.',
            },
            {
              icon: Zap,
              color: 'bg-amber-50 text-amber-600',
              title: 'Micronutrientes clave',
              desc: 'B12, hierro, zinc, calcio, vitamina D. Los que más importan en dieta vegana.',
            },
            {
              icon: BarChart3,
              color: 'bg-brand-50 text-brand-600',
              title: 'Alternativas veganas',
              desc: 'Escanea un producto no vegano y VeganTrack te sugiere sustitutos.',
            },
          ].map((f) => (
            <div key={f.title} className="card p-4 flex items-start gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${f.color}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-surface-900 text-sm">{f.title}</p>
                <p className="text-surface-500 text-xs mt-0.5 leading-relaxed">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 pb-8 text-center">
        <p className="text-xs text-surface-400 mb-2">DATOS &gt; OPINIÓN 🌱</p>
        <div className="flex items-center justify-center gap-4">
          <a
            href="https://x.com/VeganoEficaz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-surface-400 hover:text-surface-600"
          >
            @VeganoEficaz
          </a>
          <span className="text-surface-200">·</span>
          <a
            href="https://instagram.com/manual__verde"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-surface-400 hover:text-surface-600"
          >
            @manual__verde
          </a>
        </div>
      </footer>

    </div>
  );
}
