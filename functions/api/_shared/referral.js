// Programma "invita un amico": punti guadagnati dal referrer e conversione in mesi Premium.
//   - amici registrati dal tuo link: 1 amico = 10 punti, 2 = 30, 3 = 50 in totale,
//     poi 20 punti per ogni amico in piu' (quindi 10 al primo, 20 a ogni successivo)
//   - 40 punti per ogni amico che compra un abbonamento (una sola volta per amico)
//   - ogni 50 punti = 1 mese di Premium gratis (si somma a promo_until)
export const POINTS_PER_MONTH = 50;
export const PURCHASE_POINTS = 40;

export function signupPointsFor(nth) {
  return nth <= 1 ? 10 : 20;
}

// Aggiunge punti al referrer e converte ogni 50 in un mese. Il Premium regalato vive
// SOLO in promo_until: non si tocca subscription_tier, altrimenti a fine promo
// resterebbe Premium per sempre.
export function applyPoints(referrer, add) {
  let credits = (referrer.credits || 0) + add;
  let promoUntil = referrer.promo_until;
  let premiumMonths = referrer.referral_premium_months || 0;

  while (credits >= POINTS_PER_MONTH) {
    credits -= POINTS_PER_MONTH;
    premiumMonths += 1;
    const base = promoUntil && new Date(promoUntil).getTime() > Date.now() ? new Date(promoUntil) : new Date();
    base.setMonth(base.getMonth() + 1);
    promoUntil = base.toISOString();
  }

  const patch = { credits, referral_premium_months: premiumMonths };
  if (promoUntil !== referrer.promo_until) patch.promo_until = promoUntil;
  return patch;
}

async function latestSettings(supabaseAdmin, userId) {
  const { data, error } = await supabaseAdmin
    .from('user_settings')
    .select('*')
    .eq('created_by_id', userId)
    .order('created_date', { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0] || null;
}

// Un amico invitato ha comprato un abbonamento: 40 punti al referrer, una volta sola.
export async function awardPurchaseBonus(supabaseAdmin, inviteeId) {
  if (!inviteeId) return { awarded: false };
  const { data: referrals, error } = await supabaseAdmin
    .from('referral')
    .select('*')
    .eq('invitee_id', inviteeId)
    .order('created_date', { ascending: false })
    .limit(1);
  if (error) throw error;
  const ref = referrals?.[0];
  if (!ref || ref.purchase_bonus_paid) return { awarded: false };

  const referrer = await latestSettings(supabaseAdmin, ref.referrer_id);
  if (!referrer) return { awarded: false };

  const { error: updErr } = await supabaseAdmin
    .from('user_settings')
    .update(applyPoints(referrer, PURCHASE_POINTS))
    .eq('id', referrer.id);
  if (updErr) throw updErr;

  const { error: refErr } = await supabaseAdmin
    .from('referral')
    .update({ purchase_bonus_paid: true, credits_earned: (ref.credits_earned || 0) + PURCHASE_POINTS })
    .eq('id', ref.id);
  if (refErr) throw refErr;
  return { awarded: true };
}
