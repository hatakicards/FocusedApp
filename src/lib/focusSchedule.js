// Programmi ricorrenti di Focus Time: "ogni giovedi' 15:00-18:00", "tutti i giorni 9:00-12:00".
// Sono righe focus_time con is_recurring = true; repeat_days usa Date.getDay() (0 = domenica).

export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunedi' per primo

export const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
};

export const scheduleDuration = (start, end) => toMinutes(end) - toMinutes(start);

export const isValidWindow = (start, end) => {
  const d = scheduleDuration(start, end);
  return Number.isFinite(d) && d >= 15;
};

export const recurringSchedules = (sessions) =>
  (sessions || []).filter((s) => s.is_recurring && Array.isArray(s.repeat_days) && s.start_time && s.end_time);

// Il programma e' in corso adesso? Se si', restituisce l'istante di fine di oggi.
export function activeWindow(schedule, now = new Date()) {
  if (!schedule || schedule.schedule_active === false) return null;
  if (!schedule.repeat_days?.includes(now.getDay())) return null;
  const start = toMinutes(schedule.start_time);
  const end = toMinutes(schedule.end_time);
  const cur = now.getHours() * 60 + now.getMinutes();
  if (!(cur >= start && cur < end)) return null;
  const endAt = new Date(now);
  endAt.setHours(Math.floor(end / 60), end % 60, 0, 0);
  return { endAt, startedMinutesAgo: cur - start };
}

// Un solo programma attivo alla volta: quello che finisce piu' tardi.
export function currentScheduleWindow(schedules, now = new Date()) {
  let best = null;
  for (const s of recurringSchedules(schedules)) {
    const w = activeWindow(s, now);
    if (w && (!best || w.endAt > best.endAt)) best = { schedule: s, ...w };
  }
  return best;
}

// Giorni in forma corta nella lingua dell'utente (lunedi' = 1 gennaio 2024).
export function dayLabels(locale, width = 'short') {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: width });
  const base = new Date(2024, 0, 7); // domenica
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)));
}

const sameSet = (a, b) => a.length === b.length && a.every((d) => b.includes(d));

export function describeDays(days, locale, { everyDay, weekdays }) {
  const list = [...(days || [])];
  if (sameSet(list, [0, 1, 2, 3, 4, 5, 6])) return everyDay;
  if (sameSet(list, [1, 2, 3, 4, 5])) return weekdays;
  const labels = dayLabels(locale, 'short');
  return WEEK_ORDER.filter((d) => list.includes(d)).map((d) => labels[d]).join(' ');
}

// Programma da registrare nell'estensione iOS (DeviceActivity): giorni 1 = domenica come Calendar.
export function toNativeSchedule(s) {
  const start = toMinutes(s.start_time);
  const end = toMinutes(s.end_time);
  return {
    id: s.id,
    days: (s.repeat_days || []).map((d) => d + 1),
    startHour: Math.floor(start / 60),
    startMinute: start % 60,
    endHour: Math.floor(end / 60),
    endMinute: end % 60,
    mode: s.block_mode || 'selected',
  };
}
