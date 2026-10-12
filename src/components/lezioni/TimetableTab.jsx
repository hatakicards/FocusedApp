import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTimetable, useOptimisticTimetableSave, useOptimisticTimetableDelete } from '@/lib/useAppData';
import { useT, useI18n } from '@/lib/i18n';
import { WEEKDAY_NUMBERS, hhmm } from '@/lib/timetable';
import SubjectPicker from '@/components/lezioni/SubjectPicker';

// Orario settimanale: le lezioni (materia + giorno + ora). Serve a Focusy, che cosi'
// sa quando hai cosa, e ai compiti, dove la scadenza puo' essere "la prossima lezione".
export default function TimetableTab({ subjects, onManageSubjects }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: slots } = useTimetable();
  const optimisticSave = useOptimisticTimetableSave();
  const optimisticDelete = useOptimisticTimetableDelete();

  const [subject, setSubject] = useState('');
  const [weekday, setWeekday] = useState(1);
  const [start, setStart] = useState('08:00');
  const [end, setEnd] = useState('09:00');
  const [room, setRoom] = useState('');

  const dayLabel = (n) => {
    const d = new Date(2024, 0, n); // 2024-01-01 e' un lunedi'
    return d.toLocaleDateString(locale, { weekday: 'short' });
  };
  const dayLong = (n) => new Date(2024, 0, n).toLocaleDateString(locale, { weekday: 'long' });

  const all = slots || [];

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
    await optimisticSave(null, payload);
  };

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-border bg-card p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('or_nuova')}</p>
        <div className="space-y-3">
          <SubjectPicker subjects={subjects} value={subject} onChange={setSubject} onManage={onManageSubjects} />
          <div className="grid grid-cols-7 gap-1 rounded-xl bg-muted p-1">
            {WEEKDAY_NUMBERS.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setWeekday(n)}
                className={`rounded-lg py-2 text-[11px] font-semibold capitalize transition-colors ${
                  weekday === n ? 'bg-foreground text-background' : 'text-muted-foreground'
                }`}
              >
                {dayLabel(n).slice(0, 3)}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[11px] text-muted-foreground">
              {t('or_inizio')}
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </label>
            <label className="text-[11px] text-muted-foreground">
              {t('or_fine')}
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
        <button
          onClick={handleAdd}
          disabled={!subject || !start}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background transition-all active:scale-95 disabled:opacity-40"
        >
          <Plus size={16} /> {t('or_aggiungi')}
        </button>
      </div>

      {all.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t('or_vuoto')}</p>
      ) : (
        <div className="space-y-4">
          {WEEKDAY_NUMBERS.map((n) => {
            const items = all
              .filter((s) => s.weekday === n)
              .sort((a, b) => hhmm(a.start_time).localeCompare(hhmm(b.start_time)));
            if (!items.length) return null;
            return (
              <div key={n}>
                <p className="mb-2 text-xs font-semibold uppercase capitalize tracking-wider text-muted-foreground">{dayLong(n)}</p>
                <div className="space-y-2">
                  {items.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.subject}</p>
                        <p className="text-xs tabular-nums text-muted-foreground">
                          {hhmm(s.start_time)}{s.end_time ? ` – ${hhmm(s.end_time)}` : ''}{s.room ? ` · ${s.room}` : ''}
                        </p>
                      </div>
                      <button onClick={() => optimisticDelete(s.id)} className="ml-2 shrink-0 text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
