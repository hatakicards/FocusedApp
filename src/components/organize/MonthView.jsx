import { useMemo } from 'react';
import { Lock } from 'lucide-react';
import { useI18n, useT } from '@/lib/i18n';
import { dateKey } from '@/lib/calendarEvents';
import { EVENT_STYLE } from './TimeGrid';

// Mese a griglia con un puntino per ogni cosa del giorno; toccando un giorno sotto compare
// l'elenco in ordine di orario.
export default function MonthView({ viewDate, selected, onSelect, getEvents, onEventClick, onOpenDay }) {
  const { locale } = useI18n();
  const t = useT();
  const todayKey = dateKey(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const lead = (first.getDay() + 6) % 7; // lunedi' per primo
    const days = new Date(year, month + 1, 0).getDate();
    const out = [];
    for (let i = 0; i < lead; i += 1) out.push(null);
    for (let d = 1; d <= days; d += 1) out.push(new Date(year, month, d));
    return out;
  }, [year, month]);

  const headers = useMemo(() => {
    const fmt = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });
    return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(2024, 0, 1 + i)));
  }, [locale]);

  const selectedKey = selected ? dateKey(selected) : null;
  const sel = selected ? getEvents(selected) : null;
  const list = sel ? [...sel.allDay, ...sel.timed] : [];

  return (
    <div>
      <div className="mb-2 grid grid-cols-7">
        {headers.map((h, i) => <div key={i} className="text-center text-[10px] font-medium uppercase text-muted-foreground">{h}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const key = dateKey(d);
          const ev = getEvents(d);
          const all = [...ev.timed, ...ev.allDay];
          const isSel = key === selectedKey;
          return (
            <button
              key={key}
              onClick={() => onSelect(d)}
              className={`relative flex aspect-square flex-col items-center justify-center rounded-2xl transition-all active:scale-95 ${
                isSel ? 'bg-foreground text-background' : key === todayKey ? 'bg-foreground/10 ring-1 ring-foreground/30' : 'hover:bg-foreground/5'
              }`}
            >
              <span className={`text-sm ${isSel ? 'font-bold' : ''}`}>{d.getDate()}</span>
              {all.length > 0 && (
                <span className="mt-0.5 flex gap-0.5">
                  {all.slice(0, 3).map((e, k) => (
                    <span key={k} className={`h-1 w-1 rounded-full ${isSel ? 'bg-background' : (EVENT_STYLE[e.kind] || EVENT_STYLE.task).split(' ')[0]}`} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-5 rounded-3xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase capitalize tracking-wider text-muted-foreground">
              {selected.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            </h3>
            <button onClick={() => onOpenDay(selected)} className="text-xs font-semibold underline underline-offset-2">{t('org_apri_giorno')}</button>
          </div>
          {list.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">{t('ag_no_day_events')}</p>
          ) : (
            <div className="space-y-2">
              {list.map((e) => (
                <button key={e.id} onClick={() => onEventClick(e)} className="flex w-full items-center gap-3 rounded-xl bg-foreground/[0.05] py-2.5 pl-3 pr-3 text-left">
                  <span className={`h-6 w-1 shrink-0 rounded-full ${(EVENT_STYLE[e.kind] || EVENT_STYLE.task).split(' ')[0]}`} />
                  <span className={`min-w-0 flex-1 truncate text-sm font-medium ${e.done ? 'text-muted-foreground line-through' : ''}`}>{e.title}</span>
                  {e.locked && <Lock size={12} className="shrink-0 text-muted-foreground" />}
                  {e.start && <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{e.start}{e.end ? `–${e.end}` : ''}</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
