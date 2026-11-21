import { useState } from 'react';
import { Plus, Trash2, Clock, MapPin } from 'lucide-react';
import { useTimetable, useOptimisticTimetableSave, useOptimisticTimetableDelete } from '@/lib/useAppData';
import { useT, useI18n } from '@/lib/i18n';
import { WEEKDAY_NUMBERS, hhmm } from '@/lib/timetable';
import SubjectPicker from '@/components/lezioni/SubjectPicker';
import BottomSelect from '@/components/BottomSelect';

// Orario settimanale: le lezioni (materia + giorno + ora). Serve a Focusy, che cosi' sa quando hai
// cosa, e ai compiti, dove la scadenza puo' essere "la prossima lezione".
// 1.5: il giorno si sceglie a tendina (parte da oggi) e si vedono solo le sue lezioni; la nuova
// lezione va nel giorno scelto, con la materia a tendina.
const todayNumber = () => ((new Date().getDay() + 6) % 7) + 1; // 1 = lunedi' ... 7 = domenica

export default function TimetableTab({ subjects, onManageSubjects }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: slots } = useTimetable();
  const optimisticSave = useOptimisticTimetableSave();
  const optimisticDelete = useOptimisticTimetableDelete();

  const [weekday, setWeekday] = useState(todayNumber);
  const [adding, setAdding] = useState(false);
  const [subject, setSubject] = useState('');
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [room, setRoom] = useState('');

  const dayLong = (n) => new Date(2024, 0, n).toLocaleDateString(locale, { weekday: 'long' }); // 2024-01-01 e' un lunedi'
  const all = slots || [];
  const countOf = (n) => all.filter((s) => s.weekday === n).length;
  const items = all
    .filter((s) => s.weekday === weekday)
    .sort((a, b) => hhmm(a.start_time).localeCompare(hhmm(b.start_time)));

  const handleAdd = async () => {
    if (!subject || !start) return;
    const payload = {
      subject,
      weekday,
      start_time: start,
      end_time: end || null,
      room: room.trim() || null,
    };
    setRoom('');
    // La prossima lezione parte di solito quando finisce questa.
    if (end) {
      const [h, m] = end.split(':').map(Number);
      setStart(end);
      setEnd(`${String(Math.min(23, h + 1)).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
    await optimisticSave(null, payload);
  };

  const dayOptions = WEEKDAY_NUMBERS.map((n) => {
    const c = countOf(n);
    const name = dayLong(n);
    return { value: String(n), label: `${name.charAt(0).toUpperCase()}${name.slice(1)}${c ? ` · ${c}` : ''}` };
  });

  return (
    <div>
      <div className="mb-4">
        <BottomSelect
          value={String(weekday)}
          onValueChange={(v) => setWeekday(Number(v))}
          label={t('ornew_giorno')}
          options={dayOptions}
        />
      </div>

      {items.length === 0 ? (
        <p className="mb-4 rounded-2xl border border-dashed border-border py-8 text-center text-sm text-muted-foreground">{t('ornew_vuoto_giorno')}</p>
      ) : (
        <div className="mb-4 divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
          {items.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-14 shrink-0 text-right">
                <p className="text-sm font-bold tabular-nums">{hhmm(s.start_time)}</p>
                {s.end_time && <p className="text-[11px] tabular-nums text-muted-foreground">{hhmm(s.end_time)}</p>}
              </div>
              <span className="h-9 w-0.5 shrink-0 rounded-full" style={{ backgroundColor: '#3b82f6' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{s.subject}</p>
                {s.room && <p className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} />{s.room}</p>}
              </div>
              <button onClick={() => optimisticDelete(s.id)} className="ml-2 shrink-0 p-1 text-muted-foreground hover:text-destructive" aria-label={t('elimina')}>
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
        >
          <Plus size={16} /> {t('or_aggiungi')}
        </button>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('or_nuova')} · <span className="capitalize">{dayLong(weekday)}</span>
          </p>
          <div className="space-y-3">
            <SubjectPicker subjects={subjects} value={subject} onChange={setSubject} onManage={onManageSubjects} />
            <div className="grid grid-cols-2 gap-2">
              <label className="text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={11} /> {t('or_inizio')}</span>
                <input
                  type="time"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </label>
              <label className="text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Clock size={11} /> {t('or_fine')}</span>
                <input
                  type="time"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </label>
            </div>
            <input
              type="text"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              placeholder={t('or_aula_ph')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => setAdding(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
              {t('chiudi')}
            </button>
            <button
              onClick={handleAdd}
              disabled={!subject || !start}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background transition-all active:scale-95 disabled:opacity-40"
            >
              <Plus size={16} /> {t('or_aggiungi')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
