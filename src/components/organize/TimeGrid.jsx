import { useEffect, useMemo, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { dateKey, layoutLanes } from '@/lib/calendarEvents';

const HOUR_H = 52;
const FIRST_HOUR = 6;
const LAST_HOUR = 24;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

export const EVENT_STYLE = {
  task: 'bg-foreground text-background',
  meeting: 'bg-blue-500 text-white',
  deadline: 'bg-amber-500 text-black',
  focus: 'bg-emerald-600 text-white',
  lesson: 'bg-violet-600 text-white',
  verifica: 'bg-purple-500 text-white',
  gym: 'bg-red-500 text-white',
};

// Eventi della griglia: fondo velato e barretta colorata a sinistra, testo sempre leggibile.
export const EVENT_SOFT = {
  task: 'bg-foreground/[0.12] border-foreground',
  meeting: 'bg-blue-500/20 border-blue-400',
  deadline: 'bg-amber-500/20 border-amber-400',
  focus: 'bg-emerald-500/20 border-emerald-400',
  lesson: 'bg-violet-500/20 border-violet-400',
  verifica: 'bg-purple-500/20 border-purple-400',
  gym: 'bg-red-500/20 border-red-400',
};

const pad = (n) => String(n).padStart(2, '0');

// Griglia oraria stile Google Calendar: una colonna (giorno) o sette (settimana), con la
// riga dell'ora attuale, gli eventi allineati per orario e affiancati se si sovrappongono.
// Un tocco su uno spazio vuoto propone di aggiungere qualcosa a quell'ora.
export default function TimeGrid({ days, getEvents, onSlotClick, onEventClick, onDayClick }) {
  const { locale } = useI18n();
  const scrollRef = useRef(null);
  const [now, setNow] = useState(() => new Date());
  const week = days.length > 1;
  const todayKey = dateKey(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  // All'apertura la griglia parte un'ora prima di adesso (o dalle 8 se e' un altro giorno).
  useEffect(() => {
    const showsToday = days.some((d) => dateKey(d) === todayKey);
    const h = showsToday ? Math.max(FIRST_HOUR, new Date().getHours() - 1) : 8;
    if (scrollRef.current) scrollRef.current.scrollTop = (h - FIRST_HOUR) * HOUR_H;
  }, [days[0] && dateKey(days[0]), days.length]);

  const columns = useMemo(() => days.map((d) => {
    const { timed, allDay } = getEvents(d);
    return { date: d, key: dateKey(d), allDay, lanes: layoutLanes(timed) };
  }), [days, getEvents]);

  const wd = new Intl.DateTimeFormat(locale, { weekday: week ? 'narrow' : 'short' });
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const handleSlot = (e, col) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const minutes = FIRST_HOUR * 60 + Math.round(((e.clientY - rect.top) / HOUR_H) * 2) * 30;
    const m = Math.min(Math.max(minutes, FIRST_HOUR * 60), 23 * 60);
    onSlotClick?.(col.date, `${pad(Math.floor(m / 60))}:${pad(m % 60)}`);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-border/70 bg-card">
      {/* intestazione giorni */}
      <div className="flex border-b border-border/70">
        <div className="w-9 shrink-0" />
        {columns.map((c) => {
          const isToday = c.key === todayKey;
          return (
            <button key={c.key} onClick={() => onDayClick?.(c.date)} className="flex flex-1 flex-col items-center py-2">
              <span className={`text-[10px] font-medium uppercase tracking-wide ${isToday ? 'text-foreground' : 'text-muted-foreground'}`}>{wd.format(c.date)}</span>
              <span className={`mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold ${isToday ? 'bg-foreground text-background' : ''}`}>
                {c.date.getDate()}
              </span>
            </button>
          );
        })}
      </div>

      {/* eventi senza orario */}
      {columns.some((c) => c.allDay.length > 0) && (
        <div className="flex border-b border-border">
          <div className="w-9 shrink-0" />
          {columns.map((c) => (
            <div key={c.key} className="flex min-w-0 flex-1 flex-col gap-0.5 p-0.5">
              {c.allDay.slice(0, week ? 2 : 6).map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => onEventClick?.(ev)}
                  className={`truncate rounded-md border-l-2 px-1.5 py-0.5 text-left text-[10px] font-medium ${EVENT_SOFT[ev.kind] || EVENT_SOFT.task} ${ev.done ? 'opacity-50 line-through' : ''}`}
                >
                  {ev.title}
                </button>
              ))}
              {c.allDay.length > (week ? 2 : 6) && <span className="px-1 text-[9px] text-muted-foreground">+{c.allDay.length - (week ? 2 : 6)}</span>}
            </div>
          ))}
        </div>
      )}

      {/* griglia */}
      <div ref={scrollRef} className="relative h-[calc(100dvh-24rem)] min-h-[320px] overflow-y-auto overscroll-contain">
        <div className="relative flex" style={{ height: HOURS.length * HOUR_H }}>
          <div className="w-9 shrink-0">
            {HOURS.map((h) => (
              <div key={h} className="relative" style={{ height: HOUR_H }}>
                <span className="absolute -top-1.5 right-1 text-[9px] tabular-nums text-muted-foreground">{pad(h)}</span>
              </div>
            ))}
          </div>
          {columns.map((c) => (
            <div
              key={c.key}
              onClick={(e) => handleSlot(e, c)}
              className={`relative min-w-0 flex-1 cursor-pointer border-l border-border/40 ${week && c.key === todayKey ? 'bg-foreground/[0.04]' : ''}`}
              style={{ backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_H - 1}px, hsl(var(--border) / 0.45) ${HOUR_H - 1}px, hsl(var(--border) / 0.45) ${HOUR_H}px)` }}
            >
              {c.lanes.map((p) => {
                const top = ((p.s - FIRST_HOUR * 60) / 60) * HOUR_H;
                const height = Math.max(((p.e - p.s) / 60) * HOUR_H - 2, 18);
                const w = 100 / p.lanes;
                return (
                  <button
                    key={p.ev.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick?.(p.ev); }}
                    className={`absolute overflow-hidden rounded-lg border-l-[3px] px-1.5 py-1 text-left text-[10px] font-semibold leading-tight ${EVENT_SOFT[p.ev.kind] || EVENT_SOFT.task} ${p.ev.done ? 'opacity-50' : ''}`}
                    style={{ top, height, left: `calc(${p.lane * w}% + 1px)`, width: `calc(${w}% - 2px)` }}
                  >
                    <span className={`flex items-center gap-0.5 ${p.ev.done ? 'line-through' : ''}`}>
                      {p.ev.locked && <Lock size={9} className="shrink-0" />}
                      <span className="truncate">{p.ev.title}</span>
                    </span>
                    {!week && height > 30 && <span className="block text-[9px] font-normal text-muted-foreground">{p.ev.start}{p.ev.end ? `–${p.ev.end}` : ''}</span>}
                  </button>
                );
              })}
              {c.key === todayKey && nowMin >= FIRST_HOUR * 60 && (
                <div className="pointer-events-none absolute left-0 right-0 z-10 flex items-center" style={{ top: ((nowMin - FIRST_HOUR * 60) / 60) * HOUR_H }}>
                  <span className="-ml-1 h-2 w-2 rounded-full bg-red-500" />
                  <span className="h-px flex-1 bg-red-500" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
