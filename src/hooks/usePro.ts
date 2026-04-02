import { useAuthStore } from '@/stores/authStore';

export function usePro() {
  const { profile } = useAuthStore();

  const isPro = profile?.subscription_tier === 'pro' &&
    (profile?.subscription_expires_at
      ? new Date(profile.subscription_expires_at) > new Date()
      : false);

  return { isPro };
}
