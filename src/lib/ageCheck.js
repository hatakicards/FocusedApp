/**
 * Age calculation and minor-check utilities.
 * A "minor" is anyone under 18.
 */

export function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate + 'T00:00:00');
  if (isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// Eta' minima per usare Focused: 14 anni (soglia italiana per il consenso al trattamento dati, GDPR art. 8).
export const MIN_AGE = 14;

// Date impossibili (oggi, un anno fa, 1900...) arrivano da un campo data toccato per sbaglio: sull'iPhone la
// rotella parte da oggi. Le date credibili danno un'eta' tra MIN_PLAUSIBLE_AGE e MAX_AGE. La soglia di
// credibilita' e' piu' bassa di MIN_AGE di proposito: il selettore deve far scegliere anche una data sotto
// i 14 anni (senza suggerire quale eta' serva), per poi bloccare l'accesso con un messaggio neutro.
const MIN_PLAUSIBLE_AGE = 5;
const MAX_AGE = 110;
const pad = (n) => String(n).padStart(2, '0');

export function birthDateBounds() {
  const now = new Date();
  const at = (years) => `${now.getFullYear() - years}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { min: at(MAX_AGE), max: at(MIN_PLAUSIBLE_AGE) };
}

export function isPlausibleBirthDate(birthDate) {
  const age = calculateAge(birthDate);
  return age !== null && age >= MIN_PLAUSIBLE_AGE && age <= MAX_AGE;
}

// Data credibile E almeno MIN_AGE anni.
export function meetsMinAge(birthDate) {
  return isPlausibleBirthDate(birthDate) && calculateAge(birthDate) >= MIN_AGE;
}

// 'ok'      data valida e almeno MIN_AGE anni: si resta com'e'.
// 'ask'     manca o non e' credibile: va chiesta (una volta).
// 'blocked' data credibile ma sotto MIN_AGE: non si puo' continuare.
export function ageGateStatus(birthDate) {
  if (!isPlausibleBirthDate(birthDate)) return 'ask';
  return meetsMinAge(birthDate) ? 'ok' : 'blocked';
}

// Memoria locale del blocco, per non far riprovare subito con un'altra data. Dura 24 ore: chi ha
// sbagliato anno per un errore di battitura puo' riprovare il giorno dopo.
export const AGE_BLOCK_KEY = 'age_blocked_at';
const AGE_BLOCK_MS = 24 * 60 * 60 * 1000;

export function markAgeBlocked() {
  try { localStorage.setItem(AGE_BLOCK_KEY, String(Date.now())); } catch { /* storage non disponibile */ }
}

export function isAgeBlocked() {
  try {
    const at = Number(localStorage.getItem(AGE_BLOCK_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < AGE_BLOCK_MS;
  } catch { return false; }
}

// Eta' per calcoli (sonno, calorie): null se manca la data o non e' credibile.
export function usableAge(birthDate) {
  return isPlausibleBirthDate(birthDate) ? calculateAge(birthDate) : null;
}

// Nessuna data di nascita inserita (campo ora opzionale in onboarding) =>
// trattato come minorenne di default, finche' l'utente non la fornisce.
export function isMinor(birthDate) {
  if (!birthDate) return true;
  const age = calculateAge(birthDate);
  return age !== null && age < 18;
}