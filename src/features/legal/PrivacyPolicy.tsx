import { AppLogo } from '@/components/ui/AppLogo';

export function PrivacyPolicy() {
  return (
    <div className="min-h-dvh px-5 py-10 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <AppLogo className="w-10 h-10 rounded-2xl" />
        <div>
          <p className="text-xs uppercase tracking-widest text-surface-400">VeganTrack</p>
          <h1 className="font-display text-xl font-bold text-surface-900">Política de Privacidad</h1>
        </div>
      </div>

      <p className="text-xs text-surface-400 mb-8">Última actualización: mayo de 2026</p>

      <div className="space-y-7 text-surface-700 leading-relaxed text-sm">
        <section>
          <h2 className="font-semibold text-surface-900 mb-2">1. Responsable del tratamiento</h2>
          <p>
            VeganTrack es una aplicación desarrollada de forma independiente. Para cualquier consulta sobre privacidad puedes contactarnos en <strong>privacy@vegantrack.app</strong>.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">2. Datos que recopilamos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Cuenta:</strong> dirección de email y, si usas Google Sign-In, tu nombre y foto de perfil.</li>
            <li><strong>Perfil nutricional:</strong> altura, peso, fecha de nacimiento, sexo, nivel de actividad y objetivos calóricos que introduces voluntariamente.</li>
            <li><strong>Diario alimentario:</strong> los alimentos que registras, incluyendo cantidad, nutrientes y fecha.</li>
            <li><strong>Peso corporal:</strong> los registros de peso que introduces.</li>
            <li><strong>Suplementos:</strong> los suplementos y sus dosis que configuras.</li>
            <li><strong>Notificaciones push:</strong> si las activas, almacenamos el token de dispositivo para enviarte recordatorios.</li>
            <li><strong>Datos de uso:</strong> métricas anónimas de uso a través de Vercel Analytics (sin identificadores personales).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">3. Para qué usamos tus datos</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Prestarte el servicio de seguimiento nutricional.</li>
            <li>Enviarte recordatorios de registro si lo solicitas.</li>
            <li>Gestionar tu suscripción PRO.</li>
            <li>Mejorar la aplicación mediante estadísticas de uso agregadas y anónimas.</li>
          </ul>
          <p className="mt-2">No vendemos ni cedemos tus datos a terceros para fines publicitarios.</p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">4. Proveedores de servicios</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Supabase</strong> — base de datos y autenticación (servidores en la UE).</li>
            <li><strong>Stripe</strong> — procesamiento de pagos web (no almacenamos datos de tarjeta).</li>
            <li><strong>RevenueCat</strong> — gestión de suscripciones in-app en Android.</li>
            <li><strong>Google Firebase</strong> — envío de notificaciones push en Android.</li>
            <li><strong>Open Food Facts</strong> — base de datos nutricional (consultas de solo lectura).</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">5. Retención de datos</h2>
          <p>
            Conservamos tus datos mientras mantengas una cuenta activa. Puedes eliminar tu cuenta en cualquier momento desde la sección de Perfil, lo que borrará todos tus datos de forma permanente en un plazo de 30 días.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">6. Tus derechos</h2>
          <p>
            Tienes derecho a acceder, rectificar, exportar o eliminar tus datos. Para ejercer estos derechos, escríbenos a <strong>privacy@vegantrack.app</strong>. También puedes exportar tus datos directamente desde la app (función PRO).
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">7. Seguridad</h2>
          <p>
            Todos los datos se transmiten cifrados mediante HTTPS. El acceso a la base de datos está protegido por Row-Level Security (RLS) de Supabase, lo que garantiza que cada usuario solo puede acceder a sus propios datos.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">8. Cambios en esta política</h2>
          <p>
            Si realizamos cambios materiales, te notificaremos por email o mediante un aviso en la app. El uso continuado de VeganTrack tras la notificación implica tu aceptación.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-surface-900 mb-2">9. Contacto</h2>
          <p>
            Para cualquier consulta sobre privacidad contacta con nosotros en <strong>privacy@vegantrack.app</strong>.
          </p>
        </section>
      </div>

      <div className="mt-10 pt-6 border-t border-surface-200">
        <a href="/" className="text-brand-600 text-sm font-semibold">← Volver a VeganTrack</a>
      </div>
    </div>
  );
}
