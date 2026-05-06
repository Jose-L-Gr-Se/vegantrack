import { AppLogo } from '@/components/ui/AppLogo';

export function TermsOfService() {
  return (
    <div className="min-h-dvh px-5 py-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <AppLogo className="w-10 h-10 rounded-2xl" />
        <div>
          <p className="text-xs uppercase tracking-widest text-surface-400">VeganTrack</p>
          <h1 className="font-display text-xl font-bold text-surface-900">Términos de Uso</h1>
        </div>
      </div>

      <p className="text-xs text-surface-400 mb-8">Última actualización: mayo de 2026</p>

      <div className="space-y-7 text-surface-700 leading-relaxed text-sm">
        <section>
          <h2 className="font-semibold text-surface-900 mb-2">1. Aceptación de los términos</h2>
          <p>
            Al usar VeganTrack aceptas estos Términos de Uso. Si no estás de acuerdo, no uses la aplicación.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">2. Descripción del servicio</h2>
          <p>
            VeganTrack es una herramienta de seguimiento nutricional para personas que siguen una alimentación plant-based. La aplicación permite registrar alimentos, consultar datos nutricionales, gestionar recetas y suplementos, y monitorizar el peso corporal.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">3. Uso adecuado</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>VeganTrack es una herramienta informativa, no un sustituto del consejo médico o nutricional profesional.</li>
            <li>No debes usar la app con fines ilegales o para dañar a terceros.</li>
            <li>Eres responsable de mantener la confidencialidad de tu cuenta y contraseña.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">4. Plan gratuito y PRO</h2>
          <p>
            VeganTrack ofrece un plan gratuito con historial de 14 días y un plan PRO con funciones adicionales. Las suscripciones PRO se gestionan mediante Stripe (web) o Google Play Billing (app Android) y se renuevan automáticamente. Puedes cancelar en cualquier momento desde tu perfil.
          </p>
          <p className="mt-2">
            Para suscripciones adquiridas a través de Google Play, la gestión y el reembolso se realizan a través de Google Play según sus políticas.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">5. Contenido y datos nutricionales</h2>
          <p>
            Los datos nutricionales provienen principalmente de Open Food Facts, una base de datos abierta y colaborativa. VeganTrack no garantiza la exactitud de estos datos. Siempre contrasta la información con el etiquetado del producto o con un profesional de la salud.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">6. Propiedad intelectual</h2>
          <p>
            El diseño, código y marca de VeganTrack son propiedad de sus desarrolladores. Los datos nutricionales de Open Food Facts están bajo licencia ODbL.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">7. Limitación de responsabilidad</h2>
          <p>
            VeganTrack se proporciona "tal cual", sin garantías de ningún tipo. No somos responsables de decisiones de salud tomadas basándose en la información de la app. Consulta siempre a un profesional cualificado para asesoramiento médico o nutricional.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">8. Modificaciones del servicio</h2>
          <p>
            Nos reservamos el derecho de modificar o discontinuar el servicio con un preaviso razonable. Las modificaciones en precios o en el plan PRO se comunicarán con al menos 30 días de antelación.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">9. Ley aplicable</h2>
          <p>
            Estos términos se rigen por la legislación española. Cualquier disputa se someterá a los juzgados y tribunales competentes en España.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">10. Contacto</h2>
          <p>
            Para cualquier consulta sobre estos términos contacta con nosotros en <strong>legal@vegantrack.app</strong>.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-surface-200">
        <a href="/" className="text-brand-600 text-sm font-semibold">← Volver a VeganTrack</a>
      </div>
    </div>
  );
}
