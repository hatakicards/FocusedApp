import { getDB } from '@/lib/guestDB';

export const FREE_CODES = { StartFocusing: 30, 'FIRSTFOCUSED!': 30, '7DAYSFRE3': 7, 'NEWICEPROMO!': 7 };
export const LIFETIME_CODE = 'S3CR3TC0D3L1FEFR33';
// Stesso codice non riscattabile più volte, né in combinazione con gli altri di questo gruppo.
export const BLOCKED_TOGETHER = ['7DAYSFRE3', 'NEWICEPROMO!', '3MONTHS1EUR0'];

// Riscatta un codice promo gratuito (tutto tranne 3MONTHS1EUR0, che è un checkout Stripe
// gestito a parte in Profilo.jsx). Ritorna 'success' | 'invalid' | 'already_used' | 'error'.
export async function redeemFreeCode(code, { settings, user, invalidate }) {
  if (!settings) return 'error';
  try {
    if (BLOCKED_TOGETHER.includes(code)) {
      const existingUsage = await getDB().PromoCodeUsage.list('-created_date', 100);
      if (existingUsage.some((u) => BLOCKED_TOGETHER.includes(u.code))) return 'already_used';
    }
    let rewardType = null;
    if (code in FREE_CODES) {
      const until = new Date();
      until.setDate(until.getDate() + FREE_CODES[code]);
      await getDB().UserSettings.update(settings.id, { promo_until: until.toISOString() });
      rewardType = 'promo_month';
    } else if (code === LIFETIME_CODE) {
      await getDB().UserSettings.update(settings.id, { subscription_tier: 'premium' });
      rewardType = 'lifetime_premium';
    } else {
      return 'invalid';
    }
    invalidate();
    getDB().PromoCodeUsage.create({
      code,
      user_email: user?.email || '',
      user_name: user?.full_name || '',
      reward_type: rewardType,
    }).catch(console.error);
    return 'success';
  } catch (e) {
    console.error('Promo error:', e);
    return 'error';
  }
}
