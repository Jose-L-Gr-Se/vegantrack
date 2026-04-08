import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [savedReminderHour, setSavedReminderHour] = useState<number>(20);

  useEffect(() => {
    const supported =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window &&
      !!VAPID_PUBLIC_KEY;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
      void checkSubscription();
    }
  }, [user?.id]);

  const checkSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);

      // Cargar la hora guardada en BD
      if (sub && user) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('reminder_hour')
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
          .single();
        if (data?.reminder_hour != null) {
          setSavedReminderHour(data.reminder_hour);
        }
      }
    } catch {
      setIsSubscribed(false);
    }
  };

  const subscribe = async (reminderHour = 20): Promise<boolean> => {
    if (!user || !isSupported || !VAPID_PUBLIC_KEY) return false;
    setLoading(true);

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') { setLoading(false); return false; }

      const reg = await navigator.serviceWorker.ready;
      const existingSub = await reg.pushManager.getSubscription();
      const sub = existingSub ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          action: 'subscribe',
          reminderHour,
        }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setSavedReminderHour(reminderHour);
        setLoading(false);
        return true;
      }

      if (!existingSub) await sub.unsubscribe();
      setLoading(false);
      return false;
    } catch (err) {
      console.error('Push subscribe error:', err);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        await fetch('/api/push-subscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ subscription: sub.toJSON(), action: 'unsubscribe' }),
        });
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
    setLoading(false);
  };

  return {
    isSubscribed,
    isSupported,
    permission,
    loading,
    savedReminderHour,
    subscribe,
    unsubscribe,
  };
}
