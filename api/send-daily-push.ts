import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

webpush.setVapidDetails(
  'mailto:hola@vegantrack.app',
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export default async function handler(req: any, res: any) {
  const auth = req.headers.authorization;
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const now = new Date();
  const currentHour = now.getUTCHours();
  const todayStr = now.toISOString().split('T')[0];

  const { data: subs, error: subError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, p256dh, auth')
    .eq('is_active', true)
    .eq('reminder_hour', currentHour);

  if (subError || !subs || subs.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'No subs this hour' });
  }

  const userIds = subs.map((sub: any) => sub.user_id);
  const { data: todayLogs } = await supabase
    .from('food_log')
    .select('user_id')
    .in('user_id', userIds)
    .eq('date', todayStr);

  const usersWithLogs = new Set((todayLogs ?? []).map((log: any) => log.user_id));
  const pending = subs.filter((sub: any) => !usersWithLogs.has(sub.user_id));

  if (pending.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'All users already logged today' });
  }

  const payload = JSON.stringify({
    title: 'VeganTrack',
    body: 'Has registrado lo que has comido hoy? Manten tu racha.',
    url: '/',
  });

  let sent = 0;
  let failed = 0;

  for (const sub of pending) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
      );
      sent++;
    } catch (err: any) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint);
      }
    }
  }

  return res.status(200).json({ sent, failed, total: pending.length });
}
