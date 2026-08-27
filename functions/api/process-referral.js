import { getSupabaseAdmin, jsonResponse } from './_shared/supabaseAdmin.js';

export async function onRequestPost({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const { referral_code, invitee_id, invitee_email } = await request.json();

    if (!referral_code || !invitee_id) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const { data: referrerSettingsList, error: rsErr } = await supabaseAdmin
      .from('user_settings')
      .select('*')
      .eq('referral_code', referral_code)
      .order('created_date', { ascending: false })
      .limit(1);
    if (rsErr) throw rsErr;

    if (!referrerSettingsList?.length) {
      return jsonResponse({ error: 'Invalid referral code' }, 404);
    }

    const referrer = referrerSettingsList[0];

    if (referrer.created_by_id === invitee_id) {
      return jsonResponse({ error: 'Cannot refer yourself' }, 400);
    }

    const { data: existing, error: exErr } = await supabaseAdmin
      .from('referral')
      .select('id')
      .eq('invitee_id', invitee_id)
      .order('created_date', { ascending: false })
      .limit(1);
    if (exErr) throw exErr;

    if (existing?.length) {
      return jsonResponse({ error: 'Already referred', status: 'exists' }, 200);
    }

    const { error: insErr } = await supabaseAdmin.from('referral').insert({
      created_by_id: invitee_id,
      referrer_id: referrer.created_by_id,
      invitee_id,
      invitee_email: invitee_email || '',
      credits_earned: 10,
      spent_euros: 0,
    });
    if (insErr) throw insErr;

    // Premia il referrer con 10 crediti e converte in mesi premium (50 crediti = 1 mese).
    let credits = (referrer.credits || 0) + 10;
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

    const updateData = { credits, referral_premium_months: premiumMonths };
    if (promoUntil !== referrer.promo_until) {
      updateData.promo_until = promoUntil;
      updateData.subscription_tier = 'premium';
    }

    const { error: updErr } = await supabaseAdmin
      .from('user_settings')
      .update(updateData)
      .eq('id', referrer.id);
    if (updErr) throw updErr;

    return jsonResponse({ success: true, credits, premium_months: premiumMonths });
  } catch (error) {
    console.error('process-referral error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
