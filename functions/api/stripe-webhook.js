import { getSupabaseAdmin, updateUserSettings as updateSettings, jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';
import { awardPurchaseBonus } from './_shared/referral.js';

export async function onRequestPost({ request, env }) {
  try {
    const stripe = getStripe(env);
    const supabaseAdmin = getSupabaseAdmin(env);
    const signature = request.headers.get('stripe-signature');
    const rawBody = await request.text();

    const event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id;
      const tier = session.metadata?.tier === 'premium' ? 'premium' : 'pro';

      if (userId) {
        await updateSettings(supabaseAdmin, userId, {
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

        // Un amico invitato ha pagato un abbonamento: 40 punti al referrer (una volta sola).
        if ((session.amount_total || 0) > 0) {
          await awardPurchaseBonus(supabaseAdmin, userId);
        }
      }
    } else if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId) {
        await updateSettings(supabaseAdmin, userId, { ads_removed: false, subscription_tier: 'free' });
      }
    } else if (event.type === 'customer.subscription.updated') {
      const subscription = event.data.object;
      const userId = subscription.metadata?.user_id;
      if (userId && subscription.status === 'canceled') {
        await updateSettings(supabaseAdmin, userId, { ads_removed: false, subscription_tier: 'free' });
      }
    }

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('stripe-webhook error', error);
    return jsonResponse({ error: error.message }, 400);
  }
}
