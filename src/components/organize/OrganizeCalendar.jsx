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
export default function OrganizeCalendar({ listView, onToggle, onArchive, onSaveTask }) {
  const t = useT();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const getEvents = useCalendarEvents();
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

  return (
    <div>
      <div className="mb-4 flex gap-1.5 rounded-2xl border border-border bg-card p-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 rounded-xl py-2 text-xs font-semibold transition-colors ${view === v ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            {t(VIEW_KEY[v])}
          </button>
        ))}
      </div>

      {showNav && (
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center">
            <button onClick={() => shift(-1)} className="rounded-lg p-2 active:scale-95"><ChevronLeft size={20} /></button>
            <button onClick={() => shift(1)} className="rounded-lg p-2 active:scale-95"><ChevronRight size={20} /></button>
          </div>
          <h2 className="flex-1 px-1 text-sm font-semibold capitalize">{title}</h2>
          <button onClick={goToday} className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold">{t('org_oggi')}</button>
        </div>
      )}

      {showNav && (
        <button
          onClick={() => setFocusyOpen(true)}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3 text-sm font-semibold text-background active:scale-[0.99]"
        >
          <Sparkles size={16} /> {t('org_focusy_btn')}
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OrganizeFocusy open={focusyOpen} onClose={() => setFocusyOpen(false)} />
    </div>
  );
}
