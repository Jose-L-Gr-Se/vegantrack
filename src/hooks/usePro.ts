import { useAuthStore } from '@/stores/authStore';

export function usePro() {
  const { profile } = useAuthStore();

  if (!profile) return { isPro: false };

  // Si el tier es pro verificamos la fecha de expiración
  // Si no hay fecha asumimos que es válido (no debería pasar pero es más seguro)
  const isPro = profile.subscription_tier === 'pro' && (
    !profile.subscription_expires_at ||
    new Date(profile.subscription_expires_at) > new Date()
  );

  return { isPro };
}
