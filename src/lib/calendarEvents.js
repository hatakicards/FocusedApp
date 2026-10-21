import { useCallback } from 'react';
import { useTasks, useVerifiche, useGymSessions, useUserSettings, useFocusSessions, useTimetable } from '@/lib/useAppData';
import { recurringSchedules, toMinutes } from '@/lib/focusSchedule';

const pad = (n) => String(n).padStart(2, '0');
export const dateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDateKey = (k) => new Date(`${k}T12:00:00`);
const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const hhmm = (v) => (v ? String(v).slice(0, 5) : null);

// Tutto quello che finisce nel calendario di Organize, per un giorno: task e eventi con
// orario, verifiche, allenamento, programmi Focus Time ricorrenti e orario scolastico.
// Restituisce { timed: [...], allDay: [...] }; ogni evento ha kind, title, start, end e i
// dati per aprirlo (task, locked).
export function useCalendarEvents() {
  const { data: tasks } = useTasks();
  const { data: verifiche } = useVerifiche();
  const { data: gymSessions } = useGymSessions();
  const { data: settings } = useUserSettings();
  const { data: focusSessions } = useFocusSessions();
  const { data: timetable } = useTimetable();

  return useCallback((day) => {
    const key = dateKey(day);
    const monIdx = (day.getDay() + 6) % 7; // 0 = lunedi'
    const timed = [];
    const allDay = [];

    for (const task of tasks || []) {
      if (task.status === 'archived') continue;
      const onDay = task.due_date === key
        || (task.type === 'weekly' && task.weekdays?.includes(monIdx))
        || (task.type === 'project' && !task.due_date && task.expiry_date === key);
      if (!onDay) continue;
      const kind = task.type === 'meeting' ? 'meeting' : task.type === 'deadline' ? 'deadline' : 'task';
      const ev = { id: `t-${task.id}`, kind, title: task.title, task, done: task.status === 'done', start: hhmm(task.due_time), end: hhmm(task.end_time) };
      (ev.start ? timed : allDay).push(ev);
    }

    for (const v of verifiche || []) {
      if (v.status === 'scheduled' && v.date === key) allDay.push({ id: `v-${v.id}`, kind: 'verifica', title: `${v.subject}${v.topic ? ` - ${v.topic}` : ''}`, start: null, end: null });
    }

    if (settings?.gym_enabled) {
      const g = (gymSessions || []).find((s) => s.day_of_week === WEEKDAY_IDS[day.getDay()]);
      if (g) allDay.push({ id: `g-${g.id}`, kind: 'gym', title: g.title || 'Gym', start: null, end: null });
    }

    for (const s of recurringSchedules(focusSessions)) {
      if (s.schedule_active === false || !s.repeat_days.includes(day.getDay())) continue;
      timed.push({ id: `f-${s.id}-${key}`, kind: 'focus', title: s.title, start: s.start_time, end: s.end_time, locked: !!s.block_mode && s.block_mode !== 'off' });
    }

    for (const slot of timetable || []) {
      if (slot.weekday !== monIdx + 1) continue;
      timed.push({ id: `l-${slot.id}-${key}`, kind: 'lesson', title: slot.subject, start: hhmm(slot.start_time), end: hhmm(slot.end_time) });
    }

    timed.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    return { timed, allDay };
  }, [tasks, verifiche, gymSessions, settings?.gym_enabled, focusSessions, timetable]);
}

// Durata a video di un evento con orario: se manca la fine, un'ora.
export function eventSpan(ev) {
  const s = toMinutes(ev.start);
  let e = ev.end ? toMinutes(ev.end) : s + 60;
  if (!Number.isFinite(e) || e <= s) e = s + 60;
  return { s, e };
}

// Dispone eventi sovrapposti in corsie affiancate (stile Google Calendar).
export function layoutLanes(events) {
  const items = events.map((ev) => ({ ev, ...eventSpan(ev) })).sort((a, b) => a.s - b.s || a.e - b.e);
  const laneEnds = [];
  const placed = items.map((it) => {
    let lane = laneEnds.findIndex((end) => end <= it.s);
    if (lane === -1) { lane = laneEnds.length; laneEnds.push(it.e); } else laneEnds[lane] = it.e;
    return { ...it, lane };
  });
  // Numero di corsie del gruppo di sovrapposizione di ciascun evento.
  return placed.map((p) => {
    const overlapping = placed.filter((q) => q.s < p.e && q.e > p.s);
    const lanes = Math.max(...overlapping.map((q) => q.lane)) + 1;
    return { ...p, lanes };
  });
}
