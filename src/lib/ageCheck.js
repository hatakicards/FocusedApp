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

// Date impossibili (oggi, un anno fa, 1900...) arrivano da un campo data toccato per sbaglio: sull'iPhone la
// rotella parte da oggi. Le date valide danno un'eta' tra MIN_AGE e MAX_AGE.
const MIN_AGE = 5;
const MAX_AGE = 110;
const pad = (n) => String(n).padStart(2, '0');

export function birthDateBounds() {
  const now = new Date();
  const at = (years) => `${now.getFullYear() - years}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  return { min: at(MAX_AGE), max: at(MIN_AGE) };
}

export function isPlausibleBirthDate(birthDate) {
  const age = calculateAge(birthDate);
  return age !== null && age >= MIN_AGE && age <= MAX_AGE;
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