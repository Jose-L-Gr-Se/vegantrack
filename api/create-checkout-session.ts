import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_IDS = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  yearly: process.env.STRIPE_PRICE_YEARLY!,
};

export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { plan, userId, email } = await req.json();

    if (!plan || !userId || !email) {
      return new Response(
        JSON.stringify({ error: 'Faltan parámetros', received: { plan, userId, email } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const priceId = PRICE_IDS[plan as 'monthly' | 'yearly'];

    if (!priceId) {
      return new Response(
        JSON.stringify({ error: `Plan inválido: ${plan}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `https://app.vegantrack.app/?pro=success`,
      cancel_url: `https://app.vegantrack.app/`,
      customer_email: email,
      metadata: { userId },
      locale: 'es',
      allow_promotion_codes: true,
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Stripe error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
