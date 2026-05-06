import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { AppLogo } from '@/components/ui/AppLogo';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, signInWithGoogle, loading } = useAuthStore();

  const handleGoogleSignIn = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(error);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password.length < 6) {
      setError('La contrasena debe tener al menos 6 caracteres');
      return;
    }

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) setError(error);
    } else {
      const { error } = await signUp(email, password);
      if (error) {
        setError(error);
      } else {
        setSuccess('Cuenta creada. Revisa tu email para confirmar.');
      }
    }
  };

  return (
    <div className="min-h-dvh px-4 py-8 flex items-center">
      <div className="max-w-lg mx-auto w-full space-y-5">
        <section className="page-shell px-6 py-7">
          <div className="relative z-10">
            <AppLogo className="w-12 h-12 mb-5 rounded-[1.35rem] shadow-[0_14px_28px_-24px_rgba(15,23,42,0.28)]" />
            <p className="section-label mb-2">Welcome back</p>
            <h1 className="font-display text-[2.4rem] leading-[0.95] tracking-[-0.05em] text-surface-900">
              Controla tu nutricion vegana con una experiencia mas pulida.
            </h1>
            <p className="text-surface-500 mt-4 leading-relaxed">
              Mantienes la misma app y la misma funcionalidad. Solo cambia la sensacion: mas aire, mejor jerarquia y menos ruido.
            </p>
          </div>
        </section>

        <div className="card p-6">
          <div className="flex bg-surface-100/80 rounded-[1.4rem] p-1.5 mb-6">
            <button
              onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                mode === 'login'
                  ? 'bg-white text-surface-900 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]'
                  : 'text-surface-500'
              }`}
            >
              Iniciar sesion
            </button>
            <button
              onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-2xl text-sm font-semibold transition-all ${
                mode === 'register'
                  ? 'bg-white text-surface-900 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.45)]'
                  : 'text-surface-500'
              }`}
            >
              Registrarse
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="label">Contrasena</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Minimo 6 caracteres"
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                {success}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading && <Spinner className="text-white" />}
              {mode === 'login' ? 'Entrar en VeganTrack' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        {/* Separador */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-surface-200" />
          <span className="text-xs text-surface-400 uppercase tracking-widest">o continúa con</span>
          <div className="flex-1 h-px bg-surface-200" />
        </div>

        {/* Google Sign-In */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="card w-full flex items-center justify-center gap-3 py-3.5 px-5 font-semibold text-surface-800 text-sm hover:bg-surface-50 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <Spinner className="w-5 h-5 text-brand-600" />
          ) : (
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          Continuar con Google
        </button>

        <p className="text-center text-xs text-surface-400 leading-relaxed">
          Al continuar aceptas nuestra{' '}
          <a href="/privacy" className="underline text-surface-500">Política de Privacidad</a>
          {' '}y{' '}
          <a href="/terms" className="underline text-surface-500">Términos de Uso</a>
        </p>

        <p className="text-center text-xs uppercase tracking-[0.2em] text-surface-400">
          Datos por encima de opinion
        </p>
      </div>
    </div>
  );
}
