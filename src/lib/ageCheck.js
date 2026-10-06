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

// Nessuna data di nascita inserita (campo ora opzionale in onboarding) =>
// trattato come minorenne di default, finche' l'utente non la fornisce.
export function isMinor(birthDate) {
  if (!birthDate) return true;
  const age = calculateAge(birthDate);
  return age !== null && age < 18;
}