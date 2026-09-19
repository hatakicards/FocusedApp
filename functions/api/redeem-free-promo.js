import { getSupabaseAdmin, getUserFromRequest, updateUserSettings, jsonResponse } from './_shared/supabaseAdmin.js';

// Logica di sblocco (codici + premi) spostata qui dal client (era in
// src/lib/promoCodes.js) per la Guideline 3.1.1 di Apple: l'app iOS non
// puo' contenere nel proprio bundle un meccanismo che sblocca abbonamenti
// a pagamento senza passare per l'in-app purchase. Tenendo i codici e la
// scrittura di subscription_tier/promo_until solo qui lato server, il
// binario dell'app non porta piu' con se' nulla che aggiri l'IAP.
const FREE_CODES = { StartFocusing: 30, 'FIRSTFOCUSED!': 30, '7DAYSFRE3': 7, 'NEWICEPROMO!': 7 };
const LIFETIME_CODE = 'S3CR3TC0D3L1FEFR33';
const BLOCKED_TOGETHER = ['7DAYSFRE3', 'NEWICEPROMO!', '3MONTHS1EUR0'];

export async function onRequestPost({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const user = await getUserFromRequest(request, supabaseAdmin);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { code } = await request.json().catch(() => ({}));
    if (!code) return jsonResponse({ status: 'invalid' });

    if (BLOCKED_TOGETHER.includes(code)) {
      const { data: existingUsage, error } = await supabaseAdmin
        .from('promo_code_usage')
        .select('code')
        .eq('created_by_id', user.id)
        .in('code', BLOCKED_TOGETHER)
        .limit(1);
      if (error) throw error;
      if (existingUsage?.length) return jsonResponse({ status: 'already_used' });
    }

    let rewardType = null;
    if (code in FREE_CODES) {
      const until = new Date();
      until.setDate(until.getDate() + FREE_CODES[code]);
      await updateUserSettings(supabaseAdmin, user.id, { promo_until: until.toISOString() });
      rewardType = 'promo_month';
    } else if (code === LIFETIME_CODE) {
      await updateUserSettings(supabaseAdmin, user.id, { subscription_tier: 'premium' });
      rewardType = 'lifetime_premium';
    } else {
      return jsonResponse({ status: 'invalid' });
    }

    await supabaseAdmin.from('promo_code_usage').insert({
      code,
      created_by_id: user.id,
      user_email: user.email || '',
      user_name: user.user_metadata?.full_name || '',
      reward_type: rewardType,
    });

    return jsonResponse({ status: 'success' });
  } catch (error) {
    console.error('redeem-free-promo error', error);
    return jsonResponse({ status: 'error' });
  }
}
