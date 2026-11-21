import { entrySleepMinutes, getSleepNeedForAge } from '@/lib/sleepData';
import { usableAge } from '@/lib/ageCheck';
import { countableActivities } from '@/lib/activityLimit';

// Projects (1.5): quanto tempo al giorno resta davvero per i tuoi progetti, dai tuoi dati.
// Media su una settimana tipo, in ore al giorno:
//   24 - sonno - scuola - studio - lavoro - palestra - attivita' - vita quotidiana (pasti,
//   igiene, spostamenti) = tempo libero; ai progetti va circa un terzo (il resto e' riposo,
//   amici, famiglia), arrotondato alla mezz'ora, tra 30 minuti e 4 ore.

const BASICS_H = 3;          // pasti, igiene, spostamenti
const STUDY_H = 1;           // compiti e studio a casa, per chi va a scuola
const ACTIVITY_MIN = 20;     // ogni attivita' che segui ogni giorno
const ACTIVITIES_CAP_MIN = 120;

const toMin = (t) => {
  const [h, m] = String(t || '').slice(0, 5).split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};

const round1 = (h) => Math.round(h * 10) / 10;

function sleepHours(entries, birthDate) {
  const recent = [...(entries || [])]
    .filter((e) => entrySleepMinutes(e) >= 180)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 7);
  if (recent.length >= 2) {
    return { hours: recent.reduce((s, e) => s + entrySleepMinutes(e), 0) / recent.length / 60, measured: true };
  }
  const need = getSleepNeedForAge(usableAge(birthDate));
  return { hours: need?.recommended || 8, measured: false };
}

function schoolHours(timetable) {
  const weekly = (timetable || []).reduce((sum, s) => {
    const a = toMin(s.start_time);
    const b = toMin(s.end_time);
    return sum + (a != null && b != null && b > a ? b - a : 60);
  }, 0);
  return weekly / 60 / 7;
}

// Una seduta: riscaldamento 10 min + circa 2,5 min per serie (lavoro e recupero), almeno 45 min,
// piu' 30 min tra spostamenti e doccia.
function gymHours(gymSessions) {
  const weekly = (gymSessions || []).reduce((sum, s) => {
    const exercises = (s.exercises || []).filter((e) => e?.name?.trim());
    if (!exercises.length) return sum;
    const sets = exercises.reduce((n, e) => n + (Number(e.sets) || 3), 0);
    return sum + Math.max(45, 10 + sets * 2.5) + 30;
  }, 0);
  return weekly / 60 / 7;
}

function workHours(workDayLogs) {
  const recent = [...(workDayLogs || [])]
    .filter((l) => Number(l.work_hours) > 0)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 14);
  if (!recent.length) return 0;
  const avg = recent.reduce((s, l) => s + Number(l.work_hours), 0) / recent.length;
  return (avg * 5) / 7; // giorni lavorativi su una settimana
}

export function computeProjectTime({ bodyFuelEntries, settings, timetable, subjects, gymSessions, activities, workDayLogs }) {
  const sleep = sleepHours(bodyFuelEntries, settings?.birth_date);
  const school = schoolHours(timetable);
  const isStudent = school > 0 || (subjects || []).length > 0;
  const study = isStudent ? STUDY_H : 0;
  const work = workHours(workDayLogs);
  const gym = gymHours(gymSessions);
  const activityCount = countableActivities(activities).length;
  const acts = Math.min(ACTIVITIES_CAP_MIN, activityCount * ACTIVITY_MIN) / 60;

  const busy = sleep.hours + school + study + work + gym + acts + BASICS_H;
  const free = Math.max(0, 24 - busy);
  const project = Math.min(4, Math.max(0.5, Math.round(free * 0.3 * 2) / 2));

  const parts = [
    { key: 'sleep', hours: round1(sleep.hours), measured: sleep.measured },
    school > 0 && { key: 'school', hours: round1(school) },
    study > 0 && { key: 'study', hours: study },
    work > 0 && { key: 'work', hours: round1(work) },
    gym > 0 && { key: 'gym', hours: round1(gym) },
    acts > 0 && { key: 'activities', hours: round1(acts), count: activityCount },
    { key: 'basics', hours: BASICS_H },
  ].filter(Boolean);

  return { parts, free: round1(free), project, perYear: Math.round(project * 365) };
}

export function fmtHours(h) {
  const whole = Math.floor(h);
  const min = Math.round((h - whole) * 60);
  if (!whole) return `${min} min`;
  return min ? `${whole} h ${String(min).padStart(2, '0')}` : `${whole} h`;
}
