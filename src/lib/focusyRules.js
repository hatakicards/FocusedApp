import { toMinutes } from '@/lib/focusSchedule';
import { eventSpan, parseDateKey, dateKey } from '@/lib/calendarEvents';

// Regole con cui Focusy mette le cose in calendario. L'AI propone, queste regole controllano:
// dopo la scuola servono almeno 15 minuti per tornare a casa, a pranzo e a cena non si mette
// niente, e se un orario non va si chiede all'utente invece di forzarlo.
export const TRAVEL_MIN = 15;
export const MEALS = [
  { id: 'lunch', from: '12:30', to: '14:00' },
  { id: 'dinner', from: '19:30', to: '21:00' },
];

const DAY_START = 7 * 60 + 30;
const DAY_END = 22 * 60;
const pad = (n) => String(n).padStart(2, '0');
export const fromMinutes = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;

// Fasce occupate di un giorno: gli impegni con orario e, dopo ogni lezione, il tempo per tornare a casa.
function busyRanges(date, getEvents, ignoreTaskId) {
  const { timed } = getEvents(date);
  return timed
    .filter((ev) => !(ignoreTaskId && ev.task?.id === ignoreTaskId))
    .map((ev) => {
      const { s, e } = eventSpan(ev);
      return { s, e: ev.kind === 'lesson' ? e + TRAVEL_MIN : e, lesson: ev.kind === 'lesson', lessonEnd: e };
    });
}

const overlaps = (s, e, r) => s < r.e && e > r.s;

function mealHit(s, e) {
  return MEALS.find((m) => overlaps(s, e, { s: toMinutes(m.from), e: toMinutes(m.to) }));
}

// Controlla una proposta { date, start, end, task_id }. Se parte durante il tragitto dopo una lezione la
// sposta subito a fine tragitto; se cade a pranzo/cena o su un altro impegno la segna come conflitto
// (conflict: { type: 'meal' | 'busy', meal? }) e sara' l'utente a decidere.
export function checkProposal(p, getEvents) {
  const date = parseDateKey(p.date);
  const ranges = busyRanges(date, getEvents, p.task_id);
  let s = toMinutes(p.start);
  let e = toMinutes(p.end);
  const dur = Math.max(15, e - s);
  let shifted = false;

  for (const r of ranges) {
    if (r.lesson && s >= r.lessonEnd && s < r.lessonEnd + TRAVEL_MIN) {
      s = r.lessonEnd + TRAVEL_MIN;
      e = s + dur;
      shifted = true;
    }
  }

  const meal = mealHit(s, e);
  const busy = ranges.some((r) => overlaps(s, e, r));
  const conflict = meal ? { type: 'meal', meal: meal.id } : busy ? { type: 'busy' } : null;
  return { ...p, start: fromMinutes(s), end: fromMinutes(e), shifted, conflict };
}

// Primo posto libero di una giornata, il piu' vicino all'orario che si voleva: fuori da pranzo/cena,
// dagli impegni e dal tragitto dopo la scuola. null se la giornata e' piena.
export function findSlot(dayKey, durMin, preferStart, getEvents, ignoreTaskId) {
  const ranges = busyRanges(parseDateKey(dayKey), getEvents, ignoreTaskId);
  let best = null;
  for (let s = DAY_START; s + durMin <= DAY_END; s += 15) {
    const e = s + durMin;
    if (mealHit(s, e) || ranges.some((r) => overlaps(s, e, r))) continue;
    if (best === null || Math.abs(s - preferStart) < Math.abs(best - preferStart)) best = s;
  }
  return best === null ? null : { start: fromMinutes(best), end: fromMinutes(best + durMin) };
}

export function nextDayKey(dayKey) {
  const d = parseDateKey(dayKey);
  d.setDate(d.getDate() + 1);
  return dateKey(d);
}
