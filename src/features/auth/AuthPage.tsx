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
      setError('La contraseña debe tener al menos 6 caracteres');
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
        setSuccess('¡Cuenta creada! Revisa tu email para confirmar.');
      }
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-gradient-to-b from-brand-50 via-white to-white">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-3xl mb-4 shadow-lg shadow-brand-600/20">
          <Leaf className="w-8 h-8 text-white" strokeWidth={2.5} />
        </div>
        <h1 className="font-display text-3xl font-bold text-surface-900">VeganTrack</h1>
        <p className="text-surface-500 mt-1">Tu nutrición plant-based, bajo control</p>
      </div>

      {/* Form card */}
      <div className="w-full max-w-sm card p-6">
        {/* Tabs */}
        <div className="flex bg-surface-100 rounded-2xl p-1 mb-6">
          <button
            onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'login'
                ? 'bg-white text-surface-900 shadow-sm'
                : 'text-surface-500'
            }`}
          >
            Iniciar sesión
          </button>
          <button
            onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              mode === 'register'
                ? 'bg-white text-surface-900 shadow-sm'
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
            <label className="label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="Mínimo 6 caracteres"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-2xl border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-brand-50 text-brand-700 text-sm px-4 py-3 rounded-2xl border border-brand-100">
              {success}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading && <Spinner className="text-white" />}
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-surface-400">DATOS &gt; OPINIÓN</p>
    </div>
  );
}
