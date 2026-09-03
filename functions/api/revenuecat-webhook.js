import { getSupabaseAdmin, updateUserSettings, jsonResponse } from './_shared/supabaseAdmin.js';

// app_user_id nell'evento RevenueCat = user.id di Supabase, perche'
// src/lib/revenueCat.js configura l'SDK con Purchases.configure({ appUserID:
// userId }) — quindi qui non serve nessun lookup per email, e' gia' il
// nostro id.

// pro_monthly/pro_trimestral/pro_yearly, premium_monthly/premium_trimestral/
// premium_yearly — stessi Product ID creati in App Store Connect / Play
// Console (vedi src/lib/revenueCat.js).
function tierFromProductId(productId) {
  if (!productId) return null;
  if (productId.startsWith('premium_')) return 'premium';
  if (productId.startsWith('pro_')) return 'pro';
  return null;
}

// Eventi che significano "ha accesso adesso" — includono anche i rinnovi e
// il passaggio da un piano all'altro. CANCELLATION non e' qui apposta:
// vuol dire solo "non si rinnovera' piu'", l'utente mantiene l'accesso
// fino a EXPIRATION.
const GRANT_EVENTS = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION']);
const REVOKE_EVENTS = new Set(['EXPIRATION']);

export async function onRequestPost({ request, env }) {
  try {
    if (env.REVENUECAT_WEBHOOK_SECRET) {
      const auth = request.headers.get('authorization') || '';
      if (auth !== `Bearer ${env.REVENUECAT_WEBHOOK_SECRET}`) {
        return jsonResponse({ error: 'Unauthorized' }, 401);
      }
    }

    const body = await request.json();
    const event = body?.event;
    if (!event) return jsonResponse({ error: 'missing event' }, 400);

    const userId = event.app_user_id;
    const tier = tierFromProductId(event.product_id);

    if (userId && tier && GRANT_EVENTS.has(event.type)) {
      const supabaseAdmin = getSupabaseAdmin(env);
      await updateUserSettings(supabaseAdmin, userId, {
        ads_removed: true,
        subscription_tier: tier,
      });
    } else if (userId && REVOKE_EVENTS.has(event.type)) {
      const supabaseAdmin = getSupabaseAdmin(env);
      await updateUserSettings(supabaseAdmin, userId, {
        ads_removed: false,
        subscription_tier: 'free',
      });
    }
    // BILLING_ISSUE, SUBSCRIPTION_PAUSED, TRANSFER, ecc.: nessuna azione —
    // RevenueCat gestisce il periodo di grazia da solo, EXPIRATION arriva
    // comunque quando l'accesso va davvero tolto.

    return jsonResponse({ received: true });
  } catch (error) {
    console.error('revenuecat-webhook error', error);
    return jsonResponse({ error: error.message }, 400);
  }
}
