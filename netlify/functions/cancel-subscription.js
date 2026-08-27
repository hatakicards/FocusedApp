import { supabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

export default async (req) => {
  try {
    const stripe = getStripe();
    const user = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { data: settings, error } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('created_by_id', user.id)
      .order('created_date', { ascending: false })
      .limit(1);
    if (error) throw error;

    if (!settings?.length || !settings[0].stripe_subscription_id) {
      return jsonResponse({ error: 'Nessun abbonamento attivo' }, 400);
    }

    const subscription = await stripe.subscriptions.update(settings[0].stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    return jsonResponse({
      success: true,
      cancel_at: new Date(subscription.current_period_end * 1000).toISOString(),
    });
  } catch (error) {
    console.error('cancel-subscription error', error);
    return jsonResponse({ error: error.message }, 500);
  }
};
