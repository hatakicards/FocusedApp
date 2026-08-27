import { supabaseAdmin, jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

async function updateSettings(userId, patch) {
  const { data: settings, error: selectError } = await supabaseAdmin
    .from('user_settings')
    .select('id')
    .eq('created_by_id', userId)
    .order('created_date', { ascending: false })
    .limit(10);
  if (selectError) throw selectError;

  if (settings?.length) {
    const { error } = await supabaseAdmin.from('user_settings').update(patch).eq('id', settings[0].id);
    if (error) throw error;
  } else {
    const { error } = await supabaseAdmin.from('user_settings').insert({ created_by_id: userId, ...patch });
    if (error) throw error;
  }
}

// Converte crediti accumulati in mesi premium (50 crediti = 1 mese),
// esattamente come nella logica originale.
function applyCreditsToPremium(referrer, creditsToAdd) {
  let credits = (referrer.credits || 0) + creditsToAdd;
  let promoUntil = referrer.promo_until;
  let premiumMonths = referrer.referral_premium_months || 0;

  while (credits >= 50) {
    credits -= 50;
    premiumMonths += 1;
    const base =
      promoUntil && new Date(promoUntil).getTime() > Date.now() ? new Date(promoUntil) : new Date();
    base.setMonth(base.getMonth() + 1);
    promoUntil = base.toISOString();
  }

  const patch = { credits, referral_premium_months: premiumMonths };
  if (promoUntil !== referrer.promo_until) {
    patch.promo_until = promoUntil;
    patch.subscription_tier = 'premium';
  }
  return patch;
}

export default async (req) => {
  try {
    const stripe = getStripe();
    const signature = req.headers.get('stripe-signature');
    const rawBody = await req.text();

    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

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

        // Registra l'uso del codice 3MONTHS1EUR0 per impedire che si combini con 7DAYSFRE3.
        if (session.metadata?.promo === '3months_099') {
          const { error } = await supabaseAdmin.from('promo_code_usage').insert({
            created_by_id: userId,
            code: '3MONTHS1EUR0',
            user_email: session.customer_email || '',
            reward_type: 'promo_month',
          });
          if (error) console.error('PromoCodeUsage create error:', error);
        }

        // Premia il referrer con 20 crediti per euro speso dall'invitato.
        const amountEuros = (session.amount_total || 0) / 100;
        if (amountEuros > 0) {
          const { data: referrals, error: refErr } = await supabaseAdmin
            .from('referral')
            .select('*')
            .eq('invitee_id', userId)
            .order('created_date', { ascending: false })
            .limit(1);
          if (refErr) throw refErr;

          if (referrals?.length) {
            const ref = referrals[0];
            const creditsToAward = Math.floor(amountEuros * 20);

            const { data: referrerSettingsList, error: rsErr } = await supabaseAdmin
              .from('user_settings')
              .select('*')
              .eq('created_by_id', ref.referrer_id)
              .order('created_date', { ascending: false })
              .limit(1);
            if (rsErr) throw rsErr;

            if (referrerSettingsList?.length) {
              const referrerSettings = referrerSettingsList[0];
              const patch = applyCreditsToPremium(referrerSettings, creditsToAward);

              const { error: updErr } = await supabaseAdmin
                .from('user_settings')
                .update(patch)
                .eq('id', referrerSettings.id);
              if (updErr) throw updErr;

              const { error: refUpdErr } = await supabaseAdmin
                .from('referral')
                .update({
                  credits_earned: (ref.credits_earned || 0) + creditsToAward,
                  spent_euros: (ref.spent_euros || 0) + amountEuros,
                })
                .eq('id', ref.id);
              if (refUpdErr) throw refUpdErr;
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

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('stripe-webhook error', error);
    return jsonResponse({ error: error.message }, 400);
  }
};
