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
    const actualHours = (entry.sleep_hours || 0) + (entry.sleep_minutes || 0) / 60;
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