import { computeSleepRating } from '@/lib/foodDatabase';

/**
 * Sleep need calculation based on age ranges.
 * Source: National Sleep Foundation recommended sleep durations.
 * Uses the midpoint of each range as the target value.
 */

const SLEEP_NEED_BY_AGE = [
  { maxAge: 0.25, min: 14, max: 17, label: '0-3 mesi' },
  { maxAge: 2, min: 11, max: 14, label: '1-2 anni' },
  { maxAge: 5, min: 10, max: 13, label: '3-5 anni' },
  { maxAge: 13, min: 9, max: 11, label: '6-13 anni' },
  { maxAge: 17, min: 8, max: 10, label: '14-17 anni' },
  { maxAge: 64, min: 7, max: 9, label: '18-64 anni' },
  { maxAge: 200, min: 7, max: 8, label: '65+ anni' },
];

export function getSleepNeedForAge(age) {
  if (age == null) return null;
  const range = SLEEP_NEED_BY_AGE.find((r) => age <= r.maxAge);
  if (!range) return null;
  return {
    min: range.min,
    max: range.max,
    recommended: (range.min + range.max) / 2,
    label: range.label,
  };
}

/**
 * Returns the day-of-week string used by GymSession (monday, tuesday, ...)
 * for a given Date.
 */
export function getDayOfWeekString(date = new Date()) {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

/**
 * Checks if the user has a gym session scheduled for the given date.
 */
export function isGymDay(gymSessions, date = new Date()) {
  const dayId = getDayOfWeekString(date);
  return (gymSessions || []).some((s) => s.day_of_week === dayId);
}

/**
 * Full sleep debt calculation for a single day.
 * @param {number|null} age - user age (from birth_date)
 * @param {number} actualHours - hours slept (can be fractional, e.g. 7.5)
 * @param {boolean} gymDay - whether today is a gym day
 * @returns {object|null} - sleep debt info or null if age unknown
 */
export function computeSleepDebt(age, actualHours, gymDay) {
  const need = getSleepNeedForAge(age);
  if (!need) return null;
  const gymExtra = gymDay ? 0.5 : 0;
  const recommended = need.recommended + gymExtra;
  const debt = recommended - (actualHours || 0);
  return {
    ...need,
    gymExtra,
    recommended,
    actual: actualHours || 0,
    debt: Math.round(debt * 10) / 10,
    isRested: debt <= 0.5,
  };
}

/**
 * Cumulative sleep debt across ALL historical entries.
 * For each day with sleep data, computes (recommended - actual) and sums it up.
 * @param {number|null} age - user age
 * @param {array} entries - all BodyFuelEntry records with sleep data
 * @param {array} gymSessions - gym session schedule
 * @returns {object|null} - cumulative debt info or null if age unknown
 */
export function computeCumulativeSleepDebt(age, entries, gymSessions) {
  const need = getSleepNeedForAge(age);
  if (!need) return null;

  let totalDebt = 0;
  let totalRecommended = 0;
  let totalActual = 0;
  let daysCounted = 0;

  for (const entry of entries || []) {
    const actualHours = entrySleepMinutes(entry) / 60;
    if (actualHours <= 0) continue;

    const entryDate = new Date(entry.date + 'T00:00:00');
    const gymDay = isGymDay(gymSessions, entryDate);
    const gymExtra = gymDay ? 0.5 : 0;
    const recommended = need.recommended + gymExtra;

    totalDebt += recommended - actualHours;
    totalRecommended += recommended;
    totalActual += actualHours;
    daysCounted++;
  }

  return {
    ...need,
    totalDebt: Math.round(totalDebt * 10) / 10,
    totalRecommended: Math.round(totalRecommended * 10) / 10,
    totalActual: Math.round(totalActual * 10) / 10,
    daysCounted,
    avgDebt: daysCounted > 0 ? Math.round((totalDebt / daysCounted) * 10) / 10 : 0,
    isRested: totalDebt <= 0,
  };
}
/**
 * Pisolini (naps). Ogni pisolino e' { start: 'HH:MM', end: 'HH:MM', auto?: true } e sta nel campo
 * `naps` della BodyFuelEntry del giorno in cui lo fai. Regole, con le fonti mostrate nell'app:
 * - Contano nel sonno delle 24 ore, quindi tolgono minuti al debito (le raccomandazioni NSF sono
 *   ore di sonno per 24 ore). Con un debito alto pero' recuperano solo in parte (Leger et al. 2020).
 * - 10-30 minuti: solo sonno leggero (N1-N2), niente intontimento al risveglio; e' la durata che
 *   recupera di piu' dopo una notte corta (Brooks & Lack, Sleep 2006; Mayo Clinic).
 * - 30-60 minuti: si entra nel sonno profondo (N3) e svegliarsi li' lascia intontiti per un po'
 *   (inerzia del sonno). Il pisolino da 30 minuti peggiorava alcune misure in Brooks & Lack.
 * - 60-90 minuti: un ciclo completo, con sonno profondo e REM; il REM nei pisolini arriva di solito
 *   dopo circa un'ora (Mednick et al., Nature Neuroscience 2003).
 * - Oltre 90 minuti: piu' di un ciclo; i pisolini abituali di 60 minuti o piu' sono associati a piu'
 *   rischio cardiovascolare (Yamada et al., Sleep 2015) e rubano sonno alla notte.
 * - Dopo le 15 rendono piu' difficile addormentarsi la sera (Mayo Clinic).
 */
export const NAP_SOURCES = [
  { label: 'Brooks & Lack, Sleep 2006', url: 'https://doi.org/10.1093/sleep/29.6.831' },
  { label: 'Mednick et al., Nature Neuroscience 2003', url: 'https://doi.org/10.1038/nn864' },
  { label: 'Yamada et al., Sleep 2015', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4667384/' },
  { label: 'Mayo Clinic, Napping: do\'s and don\'ts', url: 'https://www.mayoclinic.org/healthy-lifestyle/adult-health/in-depth/napping/art-20048319' },
  { label: 'Léger et al., Sleep Medicine 2020', url: 'https://www.santepubliquefrance.fr/sommeil/article/napping-and-weekend-catchup-sleep-do-not-fully-compensate-high-rates-sleep-debt-and-short-sleep-a' },
];

const NAP_LATE_HOUR = 15;
const NAP_LONG_MIN = 90;

const toMin = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

export function napMinutes(nap) {
  const s = toMin(nap?.start);
  const e = toMin(nap?.end);
  if (s == null || e == null) return 0;
  return e > s ? e - s : 0;
}

// kind: 'micro' (<10) | 'power' (10-30) | 'deep' (31-60) | 'cycle' (61-90) | 'long' (>90)
export function classifyNap(nap) {
  const minutes = napMinutes(nap);
  const kind = minutes < 10 ? 'micro' : minutes <= 30 ? 'power' : minutes <= 60 ? 'deep' : minutes <= NAP_LONG_MIN ? 'cycle' : 'long';
  const late = (toMin(nap?.start) ?? 0) >= NAP_LATE_HOUR * 60;
  return { minutes, kind, late };
}

export function totalNapMinutes(naps) {
  return (naps || []).reduce((sum, n) => sum + napMinutes(n), 0);
}

// Sonno della giornata: notte + pisolini, in minuti.
export function entrySleepMinutes(entry) {
  const night = (Number(entry?.sleep_hours) || 0) * 60 + (Number(entry?.sleep_minutes) || 0);
  return night + totalNapMinutes(entry?.naps);
}

// Voto del sonno (1-5) sulle 24 ore: notte + pisolini. Un pisolino oltre i 90 minuti o iniziato
// dopo le 15 toglie un punto, perche' rovina la notte successiva. 0 = nessun dato.
export function entrySleepRating(entry) {
  const total = entrySleepMinutes(entry);
  if (total <= 0) return 0;
  const base = computeSleepRating(Math.floor(total / 60), total % 60);
  const penalty = (entry?.naps || []).some((n) => {
    const c = classifyNap(n);
    return c.minutes >= 10 && (c.kind === 'long' || c.late);
  });
  return penalty ? Math.max(1, base - 1) : base;
}
