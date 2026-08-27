import { useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, CalendarCheck, Dumbbell, ListTodo, Users } from 'lucide-react';
import { useT, useI18n, weekdayShort } from '@/lib/i18n';
import { useVerifiche, useTasks, useGymSessions, useUserSettings } from '@/lib/useAppData';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const EVENT_STYLES = {
  verifica: { color: 'bg-purple-500', icon: CalendarCheck, text: 'text-purple-400' },
  meeting: { color: 'bg-blue-500', icon: Users, text: 'text-blue-400' },
  deadline: { color: 'bg-amber-500', icon: Clock, text: 'text-amber-400' },
  task: { color: 'bg-amber-500', icon: ListTodo, text: 'text-amber-400' },
  gym: { color: 'bg-red-500', icon: Dumbbell, text: 'text-red-400' },
};

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function AgendaCalendarView() {
  const t = useT();
  const { locale } = useI18n();
  const { data: verifiche } = useVerifiche();
  const { data: tasks } = useTasks();
  const { data: gymSessions } = useGymSessions();
  const { data: settings } = useUserSettings();

  const [selectedDate, setSelectedDate] = useState(null);
  const [viewDate, setViewDate] = useState(new Date());

  // Build a map of date -> events array
  const eventsByDate = {};

  // Verifiche
  for (const v of (verifiche || [])) {
    if (v.status !== 'scheduled') continue;
    if (!eventsByDate[v.date]) eventsByDate[v.date] = [];
    eventsByDate[v.date].push({
      type: 'verifica',
      title: `${t('ag_verifica')}: ${v.subject}`,
      time: null,
      sub: v.topic || '',
    });
  }

  // Tasks with due dates — meetings and deadlines have their own distinct types
  for (const task of (tasks || [])) {
    if (task.status !== 'active') continue;
    if (!task.due_date && !task.expiry_date) continue;
    const d = task.due_date || task.expiry_date;
    if (!eventsByDate[d]) eventsByDate[d] = [];
    if (task.type === 'meeting') {
      eventsByDate[d].push({ type: 'meeting', title: task.title, time: null, sub: t('ws_riunione') });
    } else if (task.type === 'deadline') {
      eventsByDate[d].push({ type: 'deadline', title: task.title, time: null, sub: t('ws_scadenza') });
    } else {
      eventsByDate[d].push({ type: 'task', title: task.title, time: null, sub: t('ag_task') });
    }
  }

  // Gym sessions (recurring weekly)
  if (settings?.gym_enabled) {
    for (const session of (gymSessions || [])) {
      const dayIdx = WEEKDAY_IDS.indexOf(session.day_of_week);
      if (dayIdx < 0) continue;
      // Add to each occurrence in the current view month
      const year = viewDate.getFullYear();
      const month = viewDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        if (d.getDay() === dayIdx) {
          const dateStr = toLocalDateStr(d);
          if (!eventsByDate[dateStr]) eventsByDate[dateStr] = [];
          eventsByDate[dateStr].push({
            type: 'gym',
            title: session.title || t('gsc_allenamento'),
            time: null,
            sub: `${(session.exercises || []).length} ex`,
          });
        }
      }
    }
  }

  // Calendar grid
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = toLocalDateStr(new Date());

  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = toLocalDateStr(new Date(year, month, day));
    cells.push({ day, dateStr });
  }

  const weekdayLabels = weekdayShort(locale);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectedEvents = selectedDate ? (eventsByDate[selectedDate] || []) : [];

  return (
    <div>
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-foreground/5 active:scale-95 transition-all">
          <ChevronLeft size={20} />
        </button>
        <span className="text-sm font-semibold capitalize">
          {viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-foreground/5 active:scale-95 transition-all">
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-2">
        {weekdayLabels.map((wd, i) => (
          <div key={i} className="text-center text-[10px] font-medium text-muted-foreground uppercase">
            {wd}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const dayEvents = eventsByDate[cell.dateStr] || [];
          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDate;
          const hasEvents = dayEvents.length > 0;
          return (
            <button
              key={i}
              onClick={() => setSelectedDate(cell.dateStr)}
              className={`relative aspect-square rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                isSelected ? 'bg-foreground text-background' : isToday ? 'bg-foreground/10' : 'hover:bg-foreground/5'
              }`}
            >
              <span className={`text-sm ${isSelected ? 'font-bold' : ''}`}>{cell.day}</span>
              {hasEvents && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((ev, idx) => (
                    <span key={idx} className={`w-1 h-1 rounded-full ${EVENT_STYLES[ev.type]?.color || 'bg-muted-foreground'}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 capitalize">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
          {selectedEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('ag_no_day_events')}</p>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((ev, idx) => {
                const style = EVENT_STYLES[ev.type] || EVENT_STYLES.task;
                const Icon = style.icon;
                return (
                  <div key={idx} className="flex items-start gap-2.5 rounded-lg bg-foreground/5 px-3 py-2">
                    <Icon size={15} className={`${style.text} shrink-0 mt-0.5`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{ev.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {ev.time && <>{ev.time} </>}
                        {ev.sub && <>{ev.sub}</>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!selectedDate && (
        <p className="text-xs text-muted-foreground text-center mt-4">{t('ag_select_day')}</p>
      )}
    </div>
  );
}