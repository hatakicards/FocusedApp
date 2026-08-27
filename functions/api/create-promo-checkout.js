import { jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

const PREMIUM_MONTHLY_PRICE = 'price_1U0KlgI0KLr8kXE6XwE7mAX3';
const PROMO_COUPON_ID = 'promo_3months_099';

export async function onRequestPost({ request, env }) {
  try {
    const stripe = getStripe(env);
    const body = await request.json().catch(() => ({}));
    const { user_id, origin } = body;

    if (!user_id) {
      return jsonResponse({ error: 'missing user_id' }, 400);
    }

    const reqOrigin = origin || new URL(request.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PREMIUM_MONTHLY_PRICE, quantity: 1 }],
      discounts: [{ coupon: PROMO_COUPON_ID }],
      success_url: `${reqOrigin}/remove-ads-success?session_id={CHECKOUT_SESSION_ID}&tier=premium`,
      cancel_url: `${reqOrigin}/profilo`,
      metadata: {
        user_id,
        tier: 'premium',
        promo: '3months_099',
      },
      subscription_data: {
        metadata: {
          user_id,
          tier: 'premium',
          promo: '3months_099',
        },
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('create-promo-checkout error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
