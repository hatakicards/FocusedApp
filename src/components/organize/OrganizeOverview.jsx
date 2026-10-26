import { useMemo } from 'react';
import { CalendarDays, ChevronRight, Check, Sparkles, Lock } from 'lucide-react';
import { useI18n, useT } from '@/lib/i18n';
import { useCalendarEvents, dateKey } from '@/lib/calendarEvents';
import { toMinutes } from '@/lib/focusSchedule';
import { EVENT_STYLE } from './TimeGrid';

// Prima schermata di Organize: niente calendario in faccia. Dice cosa c'e' adesso (il
// prossimo impegno), com'e' la giornata (barra di avanzamento + elenco in ordine di orario)
// e cosa viene dopo. Il calendario completo e' un passo in piu' ("Calendario").
export default function OrganizeOverview({ onOpenCalendar, onOpenDay, onFocusy, onEvent, onAdd }) {
  const t = useT();
  const { locale } = useI18n();
  const getEvents = useCalendarEvents();

  const today = new Date();
  const nowMin = today.getHours() * 60 + today.getMinutes();

  const { items, next, done } = useMemo(() => {
    const { timed, allDay } = getEvents(new Date());
    const all = [...timed, ...allDay];
    const upcoming = timed.find((e) => !e.done && toMinutes(e.end || e.start) >= nowMin) || null;
    return { items: all, next: upcoming, done: all.filter((e) => e.done).length };
  }, [getEvents, nowMin]);

  const coming = useMemo(() => Array.from({ length: 3 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const ev = getEvents(d);
    return { date: d, count: ev.timed.length + ev.allDay.length };
  }).filter((c) => c.count > 0), [getEvents]);

  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  const time = (e) => (e.start ? `${e.start}${e.end ? `–${e.end}` : ''}` : t('org_all_day'));

  return (
    <div className="space-y-6">
      {/* Prossimo impegno */}
      {next ? (
        <button
          onClick={() => onEvent(next)}
          className="titanium-bg flex w-full flex-col rounded-3xl p-5 text-left active:scale-[0.99]"
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest opacity-60">{t('org_next')}</span>
          <span className="mt-2 text-2xl font-bold leading-tight tracking-tight">{next.title}</span>
          <span className="mt-1 text-sm font-medium tabular-nums opacity-70">{time(next)}</span>
        </button>
      ) : items.length === 0 ? (
        <div className="titanium-tile rounded-3xl border border-border/70 p-5">
          <span className="text-lg font-bold tracking-tight">{t('org_free_day')}</span>
          <p className="mt-1 text-sm text-muted-foreground">{t('org_free_day_sub')}</p>
        </div>
      ) : null}

      {/* Giornata */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('org_oggi')}</h2>
          {items.length > 0 && (
            <span className="text-xs tabular-nums text-muted-foreground">{t('org_progress').replace('{done}', done).replace('{total}', items.length)}</span>
          )}
        </div>
        {items.length > 0 && (
          <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div className="titanium-bg h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        {items.length === 0 ? (
          <button onClick={onAdd} className="w-full rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            {t('ag_no_day_events')}
          </button>
        ) : (
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {items.map((e) => (
              <button key={e.id} onClick={() => onEvent(e)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className={`h-8 w-1 shrink-0 rounded-full ${(EVENT_STYLE[e.kind] || EVENT_STYLE.task).split(' ')[0]}`} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-sm font-semibold ${e.done ? 'text-muted-foreground line-through' : ''}`}>{e.title}</span>
                  <span className="block text-[11px] tabular-nums text-muted-foreground">{time(e)}</span>
                </span>
                {e.locked && <Lock size={12} className="shrink-0 text-muted-foreground" />}
                {e.done && <Check size={16} className="shrink-0 text-muted-foreground" />}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Prossimi giorni */}
      {coming.length > 0 && (
        <section>
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('org_coming')}</h2>
          <div className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card">
            {coming.map((c) => (
              <button key={dateKey(c.date)} onClick={() => onOpenDay(c.date)} className="flex w-full items-center gap-3 px-4 py-3 text-left">
                <span className="min-w-0 flex-1 text-sm font-semibold capitalize">
                  {c.date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-semibold tabular-nums">{c.count}</span>
                <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Due azioni chiare */}
      <div className="grid grid-cols-2 gap-2.5">
        <button onClick={onOpenCalendar} className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card py-3.5 text-sm font-semibold active:scale-[0.98]">
          <CalendarDays size={17} /> {t('org_calendar')}
        </button>
        <button onClick={onFocusy} className="flex items-center justify-center gap-2 rounded-2xl border border-border/70 bg-card py-3.5 text-sm font-semibold active:scale-[0.98]">
          <Sparkles size={17} /> Focusy
        </button>
      </div>
    </div>
  );
}
