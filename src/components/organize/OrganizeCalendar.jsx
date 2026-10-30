import { useCallback, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n, useT } from '@/lib/i18n';
import { useCalendarEvents, dateKey } from '@/lib/calendarEvents';
import TaskForm from '@/components/TaskForm';
import TimeGrid from './TimeGrid';
import MonthView from './MonthView';
import OrganizeFocusy from './OrganizeFocusy';
import OrganizeOverview from './OrganizeOverview';

const VIEWS = ['day', 'week', 'month', 'list'];
const VIEW_KEY = { day: 'org_giorno', week: 'org_settimana', month: 'org_mese', list: 'org_lista' };

const startOfWeek = (d) => {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  x.setHours(12, 0, 0, 0);
  return x;
};

// Organize: il calendario (giorno, settimana, mese come Google Calendar), le cose da
// aggiungere e il pulsante Focusy che organizza tutto nella giornata. "Lista" e' l'elenco
// per tipo di prima, per chi preferisce quello.
export default function OrganizeCalendar({ listView, onToggle, onArchive, onDelete, onSaveTask }) {
  const t = useT();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const getEvents = useCalendarEvents();
  const [mode, setMode] = useState('overview');
  const [view, setView] = useState('day');
  const [anchor, setAnchor] = useState(() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; });
  const [selected, setSelected] = useState(() => new Date());
  const [formDefaults, setFormDefaults] = useState(null);
  const [eventOpen, setEventOpen] = useState(null);
  const [focusyOpen, setFocusyOpen] = useState(false);

  const shift = (dir) => {
    setAnchor((a) => {
      const x = new Date(a);
      if (view === 'day') x.setDate(x.getDate() + dir);
      else if (view === 'week') x.setDate(x.getDate() + dir * 7);
      else x.setMonth(x.getMonth() + dir, 1);
      return x;
    });
  };
  const goToday = () => { const d = new Date(); d.setHours(12, 0, 0, 0); setAnchor(d); setSelected(new Date()); };

  const days = useMemo(() => {
    if (view === 'day') return [anchor];
    const s = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(s); d.setDate(s.getDate() + i); return d; });
  }, [view, anchor]);

  const title = useMemo(() => {
    if (view === 'month') return anchor.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    if (view === 'week') {
      const a = days[0]; const b = days[6];
      const sameMonth = a.getMonth() === b.getMonth();
      return `${a.getDate()}${sameMonth ? '' : ` ${a.toLocaleDateString(locale, { month: 'short' })}`} – ${b.getDate()} ${b.toLocaleDateString(locale, { month: 'short' })}`;
    }
    return anchor.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  }, [view, anchor, days, locale]);

  const openForm = useCallback((date, time) => {
    setFormDefaults({ due_date: dateKey(date), due_time: time || '', end_time: '' });
  }, []);

  const handleEvent = (ev) => {
    if (ev.kind === 'focus') { navigate('/focus'); return; }
    setEventOpen(ev);
  };

  const showNav = view !== 'list';

  const todayKey = dateKey(new Date());
  const weekDays = useMemo(() => {
    const st = startOfWeek(anchor);
    return Array.from({ length: 7 }, (_, i) => { const d = new Date(st); d.setDate(st.getDate() + i); return d; });
  }, [anchor]);
  const dayLetter = new Intl.DateTimeFormat(locale, { weekday: 'narrow' });

  return (
    <div>
      {mode === 'overview' ? (
        <OrganizeOverview
          onOpenCalendar={() => setMode('calendar')}
          onOpenDay={(d) => { setAnchor(d); setView('day'); setMode('calendar'); }}
          onFocusy={() => setFocusyOpen(true)}
          onEvent={handleEvent}
          onToggle={onToggle}
          onAdd={() => openForm(new Date())}
        />
      ) : (
        <div>
          <button onClick={() => setMode('overview')} className="mb-4 flex items-center gap-1 text-sm font-semibold text-muted-foreground">
            <ChevronLeft size={16} /> {t('org_overview')}
          </button>
      <div className="mb-5 flex gap-1 rounded-full bg-foreground/[0.06] p-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${view === v ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t(VIEW_KEY[v])}
          </button>
        ))}
      </div>

      {showNav && (
        <div className="mb-4 flex items-center justify-between gap-2">
          <h2 className="min-w-0 flex-1 truncate text-lg font-semibold capitalize tracking-tight">{title}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <button onClick={() => shift(-1)} aria-label="prev" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 active:scale-95"><ChevronLeft size={18} /></button>
            <button onClick={goToday} className="h-9 rounded-full border border-border/70 px-3 text-xs font-semibold active:scale-95">{t('org_oggi')}</button>
            <button onClick={() => shift(1)} aria-label="next" className="flex h-9 w-9 items-center justify-center rounded-full border border-border/70 active:scale-95"><ChevronRight size={18} /></button>
          </div>
        </div>
      )}

      {view === 'day' && (
        <div className="mb-4 grid grid-cols-7 gap-1">
          {weekDays.map((d) => {
            const key = dateKey(d);
            const isSel = key === dateKey(anchor);
            const ev = getEvents(d);
            const has = ev.timed.length + ev.allDay.length > 0;
            return (
              <button
                key={key}
                onClick={() => setAnchor(d)}
                className={`flex flex-col items-center gap-1 rounded-2xl py-2 transition-colors active:scale-95 ${isSel ? 'bg-foreground text-background' : ''}`}
              >
                <span className={`text-[10px] font-medium uppercase ${isSel ? 'opacity-70' : 'text-muted-foreground'}`}>{dayLetter.format(d)}</span>
                <span className={`text-sm font-semibold tabular-nums ${key === todayKey && !isSel ? 'underline underline-offset-4' : ''}`}>{d.getDate()}</span>
                <span className={`h-1 w-1 rounded-full ${has ? (isSel ? 'bg-background' : 'bg-foreground/60') : 'bg-transparent'}`} />
              </button>
            );
          })}
        </div>
      )}

      {showNav && (
        <button
          onClick={() => setFocusyOpen(true)}
          className="mb-4 flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left active:scale-[0.99]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><Sparkles size={15} /></span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{t('org_focusy_btn')}</span>
          <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
        </button>
      )}

      {view === 'list' && listView}
      {(view === 'day' || view === 'week') && (
        <TimeGrid
          days={days}
          getEvents={getEvents}
          onSlotClick={openForm}
          onEventClick={handleEvent}
          onDayClick={(d) => { setAnchor(d); setView('day'); }}
        />
      )}
      {view === 'month' && (
        <MonthView
          viewDate={anchor}
          selected={selected}
          onSelect={setSelected}
          getEvents={getEvents}
          onEventClick={handleEvent}
          onOpenDay={(d) => { setAnchor(d); setView('day'); }}
        />
      )}
        </div>
      )}

      <TaskForm
        open={!!formDefaults}
        onClose={() => setFormDefaults(null)}
        onSaved={onSaveTask}
        task={formDefaults}
      />

      <Dialog open={!!eventOpen} onOpenChange={(o) => !o && setEventOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="pr-6 leading-snug">{eventOpen?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground">
            {eventOpen?.start && <p className="tabular-nums">{eventOpen.start}{eventOpen.end ? ` – ${eventOpen.end}` : ''}</p>}
            {eventOpen?.task?.notes && <p>{eventOpen.task.notes}</p>}
            {eventOpen?.locked && <p className="flex items-center gap-1.5"><Lock size={13} /> Focus</p>}
          </div>
          {eventOpen?.task && (
            <div className="mt-2 flex gap-2">
              <button
                onClick={() => { onToggle(eventOpen.task); setEventOpen(null); }}
                className="flex-1 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background"
              >
                {eventOpen.done ? t('org_riapri') : t('org_completa')}
              </button>
              <button
                onClick={() => { onArchive(eventOpen.task); setEventOpen(null); }}
                className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold"
              >
                {t('org_archivia')}
              </button>
              {onDelete && (
                <button
                  onClick={() => { onDelete(eventOpen.task); setEventOpen(null); }}
                  className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-destructive"
                >
                  {t('elimina')}
                </button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OrganizeFocusy open={focusyOpen} onClose={() => setFocusyOpen(false)} />
    </div>
  );
}
