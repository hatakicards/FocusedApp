// Orario settimanale: una lezione = { subject, weekday (1 lun ... 7 dom), start_time 'HH:MM[:SS]', end_time, room }.

export const WEEKDAY_NUMBERS = [1, 2, 3, 4, 5, 6, 7];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const hhmm = (t) => (t ? String(t).slice(0, 5) : '');

// getDay(): 0 = domenica ... 6 = sabato  ->  1 = lunedi' ... 7 = domenica.
const weekdayOf = (d) => (d.getDay() === 0 ? 7 : d.getDay());

// Le prossime `count` date (da domani in poi) in cui c'e' lezione di `subject`.
// Se `subject` e' vuoto vale per qualsiasi materia. Ritorna [{ date: 'YYYY-MM-DD', slot }].
export function nextLessons(slots, subject, count = 3, from = new Date()) {
  const mine = (slots || []).filter((s) => !subject || s.subject === subject);
  if (!mine.length) return [];
  const found = [];
  for (let i = 1; i <= 21 && found.length < count; i += 1) {
    const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const wd = weekdayOf(d);
    mine
      .filter((s) => s.weekday === wd)
      .sort((a, b) => hhmm(a.start_time).localeCompare(hhmm(b.start_time)))
      .forEach((slot) => {
        if (found.length < count) found.push({ date: toISO(d), slot });
      });
  }
  return found;
}

// Riepilogo per Focusy: orario settimanale + prossima lezione di ogni materia.
export function buildTimetableSummary(slots, from = new Date()) {
  if (!slots || !slots.length) return null;
  const days = ['', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  const byDay = WEEKDAY_NUMBERS.map((wd) => {
    const items = slots
      .filter((s) => s.weekday === wd)
      .sort((a, b) => hhmm(a.start_time).localeCompare(hhmm(b.start_time)))
      .map((s) => `${s.subject} ${hhmm(s.start_time)}${s.end_time ? `-${hhmm(s.end_time)}` : ''}${s.room ? ` (${s.room})` : ''}`);
    return items.length ? `  - ${days[wd]}: ${items.join(', ')}` : null;
  }).filter(Boolean);
  const subjects = [...new Set(slots.map((s) => s.subject))];
  const next = subjects
    .map((subj) => {
      const n = nextLessons(slots, subj, 1, from)[0];
      return n ? `  - ${subj}: ${n.date} (${days[weekdayOf(new Date(`${n.date}T00:00:00`))]} ${hhmm(n.slot.start_time)})` : null;
    })
    .filter(Boolean);
  return `${byDay.join('\n')}\nPROSSIMA LEZIONE PER MATERIA (usa queste date come scadenza quando l'utente dice "per la prossima lezione di X"):\n${next.join('\n')}`;
}
