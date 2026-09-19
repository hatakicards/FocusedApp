import { base44 } from '@/api/base44Client';

// Stesso codice non riscattabile più volte, né in combinazione con gli altri di questo gruppo
// (usato da Profilo.jsx per decidere se instradare verso lo sconto Stripe 3MONTHS1EUR0).
export const BLOCKED_TOGETHER = ['7DAYSFRE3', 'NEWICEPROMO!', '3MONTHS1EUR0'];

// Riscatta un codice promo gratuito (tutto tranne 3MONTHS1EUR0, che è un checkout Stripe
// gestito a parte in Profilo.jsx). I codici veri e propri e la logica di sblocco vivono
// solo lato server (functions/api/redeem-free-promo.js): l'app non deve spedire nel suo
// bundle un meccanismo che sblocchi abbonamenti a pagamento senza passare per l'in-app
// purchase (Apple Guideline 3.1.1). Ritorna 'success' | 'invalid' | 'already_used' | 'error'.
export async function redeemFreeCode(code, { invalidate }) {
  try {
    const res = await base44.functions.invoke('redeem-free-promo', { code });
    const status = res?.data?.status || 'error';
    if (status === 'success') invalidate();
    return status;
  } catch (e) {
    console.error('Promo error:', e);
    return 'error';
  }
}
