import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const rawBody = await req.text();

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET')
    );

    const updateSettings = async (userId, data) => {
      const settings = await base44.asServiceRole.entities.UserSettings.filter(
        { created_by_id: userId },
        '-created_date',
        10
      );
      if (settings.length > 0) {
        await base44.asServiceRole.entities.UserSettings.update(settings[0].id, data);
      } else {
        await base44.asServiceRole.entities.UserSettings.create({ created_by_id: userId, ...data });
      }
    };

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier === 'premium' ? 'premium' : 'pro';
      if (userId) {
        await updateSettings(userId, {
          ads_removed: true,
          subscription_tier: tier,
          stripe_subscription_id: session.subscription || undefined,
        });

        // Record promo code usage for 3MONTHS1EUR0 so it can't be combined with 7DAYSFRE3
        if (session.metadata?.promo === '3months_099') {
          await base44.asServiceRole.entities.PromoCodeUsage.create({
            created_by_id: userId,
            code: '3MONTHS1EUR0',
            user_email: session.customer_email || '',
            reward_type: 'promo_month',
          }).catch((e) => console.error('PromoCodeUsage create error:', e));
        }

        // Award referral credits: 20 credits per euro spent by the invitee
        const amountEuros = (session.amount_total || 0) / 100;
        if (amountEuros > 0) {
          const referrals = await base44.asServiceRole.entities.Referral.filter(
            { invitee_id: userId },
            '-created_date',
            1
          );

          if (referrals.length > 0) {
            const ref = referrals[0];
            const creditsToAward = Math.floor(amountEuros * 20);

            const referrerSettings = await base44.asServiceRole.entities.UserSettings.filter(
              { created_by_id: ref.referrer_id },
              '-created_date',
              1
            );

            if (referrerSettings.length > 0) {
              const referrer = referrerSettings[0];
              let credits = (referrer.credits || 0) + creditsToAward;
              let promoUntil = referrer.promo_until;
              let premiumMonths = referrer.referral_premium_months || 0;

              while (credits >= 50) {
                credits -= 50;
                premiumMonths += 1;
                const base = promoUntil && new Date(promoUntil).getTime() > Date.now()
                  ? new Date(promoUntil)
                  : new Date();
                base.setMonth(base.getMonth() + 1);
                promoUntil = base.toISOString();
              }

              const updateData = { credits, referral_premium_months: premiumMonths };
              if (promoUntil !== referrer.promo_until) {
                updateData.promo_until = promoUntil;
                updateData.subscription_tier = 'premium';
              }

              await base44.asServiceRole.entities.UserSettings.update(referrer.id, updateData);

              // Update referral record
              await base44.asServiceRole.entities.Referral.update(ref.id, {
                credits_earned: (ref.credits_earned || 0) + creditsToAward,
                spent_euros: (ref.spent_euros || 0) + amountEuros,
              });
            }
          }
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await updateSettings(userId, { ads_removed: false, subscription_tier: 'free' });
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId && subscription.status === 'canceled') {
        await updateSettings(userId, { ads_removed: false, subscription_tier: 'free' });
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('stripe-webhook error', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});