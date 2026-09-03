import { jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

const PRICE_IDS = {
  pro: {
    monthly: 'price_1U9hdpI0KLr8kXE6CKXK9r2K',
    quarterly: 'price_1U9hdpI0KLr8kXE6BxGjWMkd',
    annual: 'price_1U9hdqI0KLr8kXE6kmd9jSjh',
  },
  premium: {
    monthly: 'price_1U9hdqI0KLr8kXE6sGahmUXr',
    quarterly: 'price_1U9hdrI0KLr8kXE6TRIyBWHc',
    annual: 'price_1U9hdrI0KLr8kXE6RLBWaIhX',
  },
};

const BMINDSET_COUPON_ID = 'bmindset_30off';

async function ensureBmindsetCoupon(stripe) {
  try {
    return await stripe.coupons.retrieve(BMINDSET_COUPON_ID);
  } catch {
    return await stripe.coupons.create({
      id: BMINDSET_COUPON_ID,
      percent_off: 30,
      duration: 'once',
      name: 'BMindset Promo 30%',
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const stripe = getStripe(env);
    const body = await request.json().catch(() => ({}));
    const { tier, period, user_id, origin, promoCode } = body;

    if (tier !== 'pro' && tier !== 'premium') {
      return jsonResponse({ error: 'invalid tier' }, 400);
    }
    if (!user_id) {
      return jsonResponse({ error: 'missing user_id' }, 400);
    }

    const billingPeriod = period || 'monthly';
    if (!['monthly', 'quarterly', 'annual'].includes(billingPeriod)) {
      return jsonResponse({ error: 'invalid period' }, 400);
    }

    const reqOrigin = origin || new URL(request.url).origin;
    const priceId = PRICE_IDS[tier][billingPeriod];

    const sessionParams = {
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${reqOrigin}/remove-ads-success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${reqOrigin}/profilo`,
      metadata: { user_id, tier },
      subscription_data: {
        metadata: { user_id, tier },
      },
      allow_promotion_codes: true,
    };

    if ((promoCode || '').trim().toUpperCase() === 'BMINDSETPROMO') {
      const coupon = await ensureBmindsetCoupon(stripe);
      sessionParams.discounts = [{ coupon: coupon.id }];
      delete sessionParams.allow_promotion_codes;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('create-remove-ads-checkout error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
