import { jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

const PREMIUM_MONTHLY_PRICE = 'price_1U0KlgI0KLr8kXE6XwE7mAX3';
const TRIAL_DISCOUNT_COUPON_ID = 'trial_40off_first_month';

// Sconto del 40% sul primo mese, offerto a fine prova gratuita di 7 giorni
// (vedi TrialExpiredModal.jsx). Coupon creato al volo se non esiste ancora
// su Stripe, stesso pattern di create-remove-ads-checkout.js.
async function ensureCoupon(stripe) {
  try {
    return await stripe.coupons.retrieve(TRIAL_DISCOUNT_COUPON_ID);
  } catch {
    return await stripe.coupons.create({
      id: TRIAL_DISCOUNT_COUPON_ID,
      percent_off: 40,
      currency: 'eur',
      duration: 'once',
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const stripe = getStripe(env);
    const body = await request.json().catch(() => ({}));
    const { user_id, origin } = body;

    if (!user_id) {
      return jsonResponse({ error: 'missing user_id' }, 400);
    }

    const reqOrigin = origin || new URL(request.url).origin;
    const coupon = await ensureCoupon(stripe);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: PREMIUM_MONTHLY_PRICE, quantity: 1 }],
      discounts: [{ coupon: coupon.id }],
      success_url: `${reqOrigin}/remove-ads-success?session_id={CHECKOUT_SESSION_ID}&tier=premium`,
      cancel_url: `${reqOrigin}/profilo`,
      metadata: { user_id, tier: 'premium', promo: 'trial_40off' },
      subscription_data: {
        metadata: { user_id, tier: 'premium', promo: 'trial_40off' },
      },
    });

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('create-trial-discount-checkout error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
