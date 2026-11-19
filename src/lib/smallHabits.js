// 1.5: Small Habits. Piccole abitudini dentro ogni attivita', segnate fatte / non fatte
// (niente voto 1-5), con ricorrenza, uno o piu' orari e la loro streak.
// Tabelle: small_habit, small_habit_log (supabase/migrations/0019_small_habits.sql).
//
// Regole della streak (decise dal fondatore il 16/11/2026):
// - un giorno previsto e non fatto la azzera;
// - 2 recuperi al mese per abitudine, che valgono solo se l'abitudine viene fatta
//   il giorno previsto successivo. Il recupero e' una riga di log con status 'restored'
//   sul giorno saltato.
// - Oggi non ancora fatto non rompe la streak: la giornata non e' finita.

export const RESTORES_PER_MONTH = 2;
const MAX_LOOKBACK_DAYS = 800;

// ---- date locali "YYYY-MM-DD" (mai UTC: a mezzanotte italiana UTC e' ancora ieri) ----

export function isoDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseISO(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDays(iso, n) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

// Giorno (locale) in cui l'abitudine e' stata creata: prima di quel giorno non c'e' niente da fare.
function startISO(habit) {
  if (!habit?.created_date) return null;
  const d = new Date(habit.created_date);
  return Number.isNaN(d.getTime()) ? null : isoDate(d);
}

// ---- calendario ----

export function slotCount(habit) {
  return Math.max(1, (habit?.times || []).length);
}

export function isScheduled(habit, iso) {
  const days = habit?.repeat_days;
  if (!Array.isArray(days) || days.length === 0 || days.length === 7) return true;
  return days.includes(parseISO(iso).getDay());
}

// Il giorno previsto precedente (strettamente prima di iso), o null se non ce n'e' entro un anno.
export function previousScheduled(habit, iso) {
  let cur = iso;
  for (let i = 0; i < 370; i += 1) {
    cur = addDays(cur, -1);
    if (isScheduled(habit, cur)) return cur;
  }
  return null;
}

// Mappa "data" -> { slots: Set di slot fatti, restored: bool } per una sola abitudine.
export function indexLogs(logs, habitId) {
  const map = new Map();
  for (const l of logs || []) {
    if (l.habit_id !== habitId) continue;
    const key = String(l.date).slice(0, 10);
    const entry = map.get(key) || { slots: new Set(), restored: false };
    if (l.status === 'restored') entry.restored = true;
    else entry.slots.add(Number(l.slot) || 0);
    map.set(key, entry);
  }
  return map;
}

// 'done' = tutti gli orari fatti (o giorno recuperato), 'partial' = solo alcuni, 'none' = niente.
export function dayState(habit, index, iso) {
  const entry = index.get(iso);
  if (!entry) return 'none';
  if (entry.restored) return 'done';
  const need = slotCount(habit);
  let done = 0;
  for (let s = 0; s < need; s += 1) if (entry.slots.has(s)) done += 1;
  if (done >= need) return 'done';
  return done > 0 ? 'partial' : 'none';
}

export function isSlotDone(index, iso, slot) {
  const entry = index.get(iso);
  return !!entry && (entry.restored || entry.slots.has(slot));
}

// ---- streak ----

export function computeHabitStreak(habit, logs, today) {
  const index = indexLogs(logs, habit.id);
  const start = startISO(habit);
  let streak = 0;
  let cur = today;
  if (isScheduled(habit, cur) && dayState(habit, index, cur) === 'done') streak += 1;
  for (let i = 0; i < MAX_LOOKBACK_DAYS; i += 1) {
    cur = previousScheduled(habit, cur);
    if (!cur || (start && cur < start)) break;
    if (dayState(habit, index, cur) !== 'done') break;
    // Il giorno recuperato tiene viva la streak ma non la allunga.
    if (!index.get(cur)?.restored) streak += 1;
  }
  return streak;
}

export function restoresUsedInMonth(logs, habitId, iso) {
  const month = String(iso).slice(0, 7);
  return (logs || []).filter((l) => l.habit_id === habitId && l.status === 'restored' && String(l.date).slice(0, 7) === month).length;
}

// Puo' recuperare la streak? Serve: il giorno previsto prima di oggi saltato, quello prima
// ancora fatto (c'era una streak da salvare), recuperi del mese non finiti.
// ready = oggi e' gia' fatto, quindi il recupero si puo' usare adesso;
// altrimenti va mostrato come "falla oggi per recuperare la streak".
export function restoreInfo(habit, logs, today) {
  if (!isScheduled(habit, today)) return null;
  const index = indexLogs(logs, habit.id);
  const start = startISO(habit);
  const missed = previousScheduled(habit, today);
  if (!missed || (start && missed < start)) return null;
  if (dayState(habit, index, missed) === 'done') return null;
  const before = previousScheduled(habit, missed);
  if (!before || (start && before < start) || dayState(habit, index, before) !== 'done') return null;
  const used = restoresUsedInMonth(logs, habit.id, missed);
  if (used >= RESTORES_PER_MONTH) return null;
  // Streak che tornerebbe col recupero: quella fino al giorno prima del salto.
  const savedStreak = computeHabitStreak(habit, logs, before);
  return {
    missedDate: missed,
    left: RESTORES_PER_MONTH - used,
    ready: dayState(habit, index, today) === 'done',
    savedStreak,
  };
}

// ---- orari ----

export function normalizeTime(v) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(v || '').trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function sortTimes(times) {
  return [...new Set((times || []).map(normalizeTime).filter(Boolean))].sort();
}

// Proposta immediata senza AI, dalle parole del nome (funziona anche offline e per gli ospiti).
// Focusy (AI) puo' poi raffinarla. Restituisce null se il nome non dice niente sull'orario.
const RULES = [
  { re: /(skin ?care|skincare|crema viso|pelle|routine viso|cura della pelle|piel|peau|hautpflege)/i, times: ['07:30', '22:00'] },
  { re: /(denti|teeth|dientes|dents|z[aä]hne)/i, times: ['08:00', '22:00'] },
  { re: /(mattin|morning|sveglia|colazione|breakfast|ma[nñ]ana|matin|morgen|fr[uü]h)/i, times: ['07:30'] },
  { re: /(pranzo|lunch|almuerzo|d[eé]jeuner|mittag)/i, times: ['13:00'] },
  { re: /(pomerigg|afternoon|tarde|apr[eè]s-midi|nachmittag)/i, times: ['16:00'] },
  { re: /(sera|evening|notte|night|letto|bed|dormir|noche|soir|abend|nacht)/i, times: ['21:30'] },
];

export function quickTimeGuess(name) {
  const n = String(name || '');
  for (const r of RULES) if (r.re.test(n)) return [...r.times];
  return null;
}

// Abitudini di oggi in ordine di orario: una voce per ogni orario (skincare 07:30 e 22:00 = 2 voci).
// Quelle senza orario vanno in fondo.
export function todayItems(habits, logs, today) {
  const items = [];
  for (const h of habits || []) {
    if (h.archived || !isScheduled(h, today)) continue;
    const index = indexLogs(logs, h.id);
    const times = (h.times || []).length ? h.times : [null];
    times.forEach((time, slot) => {
      items.push({ habit: h, slot, time, done: isSlotDone(index, today, slot) });
    });
  }
  return items.sort((a, b) => {
    if (a.time && b.time) return a.time.localeCompare(b.time);
    if (a.time) return -1;
    if (b.time) return 1;
    return String(a.habit.name).localeCompare(String(b.habit.name));
  });
}
