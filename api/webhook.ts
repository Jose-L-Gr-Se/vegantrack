import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export const config = { runtime: 'edge' };

function getExpiresAt(subscription: any): string {
  // Intentar diferentes rutas según versión de API
  const raw =
    subscription.current_period_end ??
    subscription.billing_cycle_anchor ??
    null;

  if (raw && typeof raw === 'number') {
    return new Date(raw * 1000).toISOString();
  }
  if (raw && typeof raw === 'string') {
    return new Date(raw).toISOString();
  }
  // Fallback: 1 año desde ahora
  const fallback = new Date();
  fallback.setFullYear(fallback.getFullYear() + 1);
  return fallback.toISOString();
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new Response('Missing signature', { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        console.log('checkout.session.completed', { userId, customerId, subscriptionId });

        if (userId && subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          console.log('subscription raw:', JSON.stringify(subscription));

          const expiresAt = getExpiresAt(subscription);

          const { error } = await supabase
            .from('profiles')
            .update({
              subscription_tier: 'pro',
              subscription_expires_at: expiresAt,
              stripe_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) {
            console.error('Supabase update error:', error);
            throw new Error(`Supabase error: ${error.message}`);
          }

          console.log('Profile updated to pro for userId:', userId);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        const customerId = subscription.customer as string;
        const isActive = subscription.status === 'active';
        const expiresAt = getExpiresAt(subscription);

        await supabase
          .from('profiles')
          .update({
            subscription_tier: isActive ? 'pro' : 'free',
            subscription_expires_at: isActive ? expiresAt : null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from('profiles')
          .update({
            subscription_tier: 'free',
            subscription_expires_at: null,
            updated_at: new Date().toISOString(),
          })
          .eq('stripe_customer_id', customerId);
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err);
    return new Response(`Handler Error: ${err.message}`, { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
