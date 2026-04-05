import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Spinner } from '@/components/ui/Spinner';
import { Leaf } from 'lucide-react';

export function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { signIn, signUp, loading } = useAuthStore();

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
            <div className="icon-badge bg-brand-600 text-white border-0 mb-5">
              <Leaf className="w-5 h-5" strokeWidth={2.5} />
            </div>
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

        <p className="text-center text-xs uppercase tracking-[0.2em] text-surface-400">
          Datos por encima de opinion
        </p>
      </div>
    </div>
  );
}
