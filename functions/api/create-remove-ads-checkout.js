import { jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

const PRICE_IDS = {
  pro: {
    monthly: 'price_1U0KlgI0KLr8kXE6pr0ITKIu',
    quarterly: 'price_1U0KlgI0KLr8kXE6yVYiPyIl',
    annual: 'price_1U0KlgI0KLr8kXE6aTXNReX8',
  },
  premium: {
    monthly: 'price_1U0KlgI0KLr8kXE6XwE7mAX3',
    quarterly: 'price_1U0KlgI0KLr8kXE65uObC4tj',
    annual: 'price_1U0KlgI0KLr8kXE6LkSh268l',
  },
};

const INTRO_DISCOUNTS = {
  pro_monthly: 150,
  premium_monthly: 200,
  pro_quarterly: 300,
  premium_quarterly: 400,
};

async function ensureCoupon(stripe, couponId, amountOffCents) {
  try {
    return await stripe.coupons.retrieve(couponId);
  } catch {
    return await stripe.coupons.create({
      id: couponId,
      amount_off: amountOffCents,
      currency: 'eur',
      duration: 'once',
    });
  }
}

export async function onRequestPost({ request, env }) {
  try {
    const stripe = getStripe(env);
    const body = await request.json().catch(() => ({}));
    const { tier, period, user_id, origin } = body;

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
    };

    if (billingPeriod === 'monthly' || billingPeriod === 'quarterly') {
      const couponKey = `${tier}_${billingPeriod}`;
      const discountAmount = INTRO_DISCOUNTS[couponKey];
      if (discountAmount) {
        const coupon = await ensureCoupon(stripe, `intro_${couponKey}`, discountAmount);
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    return jsonResponse({ url: session.url });
  } catch (error) {
    console.error('create-remove-ads-checkout error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
