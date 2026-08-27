import { supabaseAdmin, jsonResponse } from './_shared/supabaseAdmin.js';
import { getStripe } from './_shared/stripeClient.js';

// Nessuna autenticazione richiesta qui apposta (come nell'originale
// base44): la prova di legittimita' e' il session_id di Stripe stesso,
// verificato lato server — l'utente potrebbe atterrare su questa pagina
// subito dopo il pagamento, prima ancora che la sessione app sia pronta.
export default async (req) => {
  try {
    const stripe = getStripe();
    const body = await req.json().catch(() => ({}));
    const sessionId = body.session_id;
    if (!sessionId || typeof sessionId !== 'string') {
      return jsonResponse({ error: 'missing session_id' }, 400);
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return jsonResponse({ error: 'payment not completed' }, 400);
    }

    const userId = session.metadata?.user_id;
    if (!userId) {
      return jsonResponse({ error: 'missing user_id in session' }, 400);
    }

    const tier = session.metadata?.tier === 'premium' ? 'premium' : 'pro';

    const { data: settings, error: selectError } = await supabaseAdmin
      .from('user_settings')
      .select('id')
      .eq('created_by_id', userId)
      .order('created_date', { ascending: false })
      .limit(10);
    if (selectError) throw selectError;

    if (settings?.length) {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .update({ ads_removed: true, subscription_tier: tier })
        .eq('id', settings[0].id);
      if (error) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from('user_settings')
        .insert({ created_by_id: userId, ads_removed: true, subscription_tier: tier });
      if (error) throw error;
    }

    return jsonResponse({ ok: true, tier });
  } catch (error) {
    console.error('confirm-remove-ads error', error);
    return jsonResponse({ error: error.message }, 500);
  }
};
