import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

const PREMIUM_MONTHLY_PRICE = 'price_1U0KlgI0KLr8kXE6XwE7mAX3';
const PROMO_COUPON_ID = 'promo_3months_099';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { user_id, origin } = body;

    if (!user_id) {
      return Response.json({ error: 'missing user_id' }, { status: 400 });
    }

    const reqOrigin = origin || new URL(req.url).origin;
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PREMIUM_MONTHLY_PRICE, quantity: 1 }],
      discounts: [{ coupon: PROMO_COUPON_ID }],
      success_url: `${reqOrigin}/remove-ads-success?session_id={CHECKOUT_SESSION_ID}&tier=premium`,
      cancel_url: `${reqOrigin}/profilo`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id,
        tier: 'premium',
        promo: '3months_099',
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id,
          tier: 'premium',
          promo: '3months_099',
        },
      },
    });

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-promo-checkout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});