// Prova gratuita di Premium dentro l'app: si sceglie alla fine del benvenuto, non chiede carta e non si
// rinnova da sola (finita la prova si torna al piano gratuito). Dura 3 giorni; le prove partite prima
// del 9 novembre 2026 (quando era automatica) restano di 7.
export const APP_TRIAL_DAYS = 3;
const OLD_TRIAL_DAYS = 7;
const SHORT_TRIAL_FROM = Date.parse('2026-11-09T00:00:00Z');

export function appTrialMs(trialStart) {
  const start = new Date(trialStart).getTime();
  const days = start >= SHORT_TRIAL_FROM ? APP_TRIAL_DAYS : OLD_TRIAL_DAYS;
  return days * 24 * 60 * 60 * 1000;
}

export function isAppTrialActive(trialStart, now = Date.now()) {
  if (!trialStart) return false;
  const start = new Date(trialStart).getTime();
  return now - start < appTrialMs(trialStart);
}
