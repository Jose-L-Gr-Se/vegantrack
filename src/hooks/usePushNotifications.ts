import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

// ─── Native (Capacitor) push ────────────────────────────────────────────────

function useNativePushNotifications() {
  const { user } = useAuthStore();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [savedReminderHour, setSavedReminderHour] = useState<number>(20);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    void checkNativeSubscription();
  }, [user?.id]);

  const checkNativeSubscription = async () => {
    const { data } = await supabase
      .from('push_subscriptions')
      .select('reminder_hour')
      .eq('user_id', user!.id)
      .eq('endpoint', 'fcm')
      .maybeSingle();
    setIsSubscribed(!!data);
    if (data?.reminder_hour != null) setSavedReminderHour(data.reminder_hour);
  };

  const subscribe = async (reminderHour = 20): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      let perm = await PushNotifications.checkPermissions();
      if (perm.receive !== 'granted') {
        perm = await PushNotifications.requestPermissions();
      }
      if (perm.receive !== 'granted') { setLoading(false); return false; }

      await PushNotifications.register();

      // El token FCM llega via evento 'registration' — lo capturamos con una promesa
      const token = await new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => resolve(null), 10000);
        PushNotifications.addListener('registration', (t) => {
          clearTimeout(timeout);
          resolve(t.value);
        });
        PushNotifications.addListener('registrationError', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      });

      if (!token) { setLoading(false); return false; }

      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;

      const res = await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ subscription: { type: 'fcm', token }, action: 'subscribe', reminderHour }),
      });

      if (res.ok) {
        setIsSubscribed(true);
        setSavedReminderHour(reminderHour);
        setLoading(false);
        return true;
      }
      setLoading(false);
      return false;
    } catch (err) {
      console.error('Native push subscribe error:', err);
      setLoading(false);
      return false;
    }
  };

  const unsubscribe = async (): Promise<void> => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authToken = session?.access_token;
      await fetch('/api/push-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ subscription: { type: 'fcm' }, action: 'unsubscribe' }),
      });
      setIsSubscribed(false);
    } catch (err) {
      console.error('Native push unsubscribe error:', err);
    }
    setLoading(false);
  };

  return {
    isSubscribed,
    isSupported: true,
    permission: 'default' as NotificationPermission,
    loading,
    savedReminderHour,
    subscribe,
    unsubscribe,
  };
}

// ─── Web Push ────────────────────────────────────────────────────────────────

function useWebPushNotifications() {
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

      if (sub && user) {
        const { data } = await supabase
          .from('push_subscriptions')
          .select('reminder_hour')
          .eq('user_id', user.id)
          .eq('endpoint', sub.endpoint)
          .single();
        if (data?.reminder_hour != null) setSavedReminderHour(data.reminder_hour);
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ subscription: sub.toJSON(), action: 'subscribe', reminderHour }),
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
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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

  return { isSubscribed, isSupported, permission, loading, savedReminderHour, subscribe, unsubscribe };
}

// ─── Public hook — elige nativo o web automáticamente ───────────────────────

export function usePushNotifications() {
  const isNative = Capacitor.isNativePlatform();
  const nativeHook = useNativePushNotifications();
  const webHook = useWebPushNotifications();
  return isNative ? nativeHook : webHook;
}
