import { getSupabaseAdmin, jsonResponse } from './_shared/supabaseAdmin.js';
import { applyPoints, signupPointsFor } from './_shared/referral.js';

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

    // Quanti amici ha gia' invitato: il primo vale 10 punti, ognuno dopo 20
    // (1 amico = 10, 2 = 30, 3 = 50 in totale, poi +20 per ogni amico in piu').
    const { count, error: cntErr } = await supabaseAdmin
      .from('referral')
      .select('id', { count: 'exact', head: true })
      .eq('referrer_id', referrer.created_by_id);
    if (cntErr) throw cntErr;
    const points = signupPointsFor((count || 0) + 1);

    const { error: insErr } = await supabaseAdmin.from('referral').insert({
      created_by_id: invitee_id,
      referrer_id: referrer.created_by_id,
      invitee_id,
      invitee_email: invitee_email || '',
      credits_earned: points,
      spent_euros: 0,
    });
    if (insErr) throw insErr;

    const patch = applyPoints(referrer, points);
    const { error: updErr } = await supabaseAdmin.from('user_settings').update(patch).eq('id', referrer.id);
    if (updErr) throw updErr;

    return jsonResponse({ success: true, points, credits: patch.credits, premium_months: patch.referral_premium_months });
  } catch (error) {
    console.error('process-referral error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
