import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { tier, period, user_id, origin } = body;

    if (tier !== 'pro' && tier !== 'premium') {
      return Response.json({ error: 'invalid tier' }, { status: 400 });
    }
    if (!user_id) {
      return Response.json({ error: 'missing user_id' }, { status: 400 });
    }

    const billingPeriod = period || 'monthly';
    if (!['monthly', 'quarterly', 'annual'].includes(billingPeriod)) {
      return Response.json({ error: 'invalid period' }, { status: 400 });
    }

    const reqOrigin = origin || new URL(req.url).origin;
    const priceId = PRICE_IDS[tier][billingPeriod];

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    const sessionParams = {
      mode: 'subscription' as const,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${reqOrigin}/remove-ads-success?session_id={CHECKOUT_SESSION_ID}&tier=${tier}`,
      cancel_url: `${reqOrigin}/profilo`,
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        user_id,
        tier,
      },
      subscription_data: {
        metadata: {
          base44_app_id: Deno.env.get('BASE44_APP_ID'),
          user_id,
          tier,
        },
      },
    };

    if (billingPeriod === 'monthly' || billingPeriod === 'quarterly') {
      const couponKey = `${tier}_${billingPeriod}`;
      const discountAmount = INTRO_DISCOUNTS[couponKey];
      if (discountAmount) {
        const coupon = await ensureCoupon(stripe, `intro_${couponKey}`, discountAmount);
        (sessionParams as any).discounts = [{ coupon: coupon.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams as any);

    return Response.json({ url: session.url });
  } catch (error) {
    console.error('create-premium-checkout error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});