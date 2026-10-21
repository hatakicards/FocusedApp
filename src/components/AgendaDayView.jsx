import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Check, Clock, Dumbbell, CalendarCheck, Users, Lock, Circle, Plus } from 'lucide-react';
import { useI18n, useT } from '@/lib/i18n';
import { useTasks, useGymSessions, useUserSettings, useVerifiche, useFocusSessions } from '@/lib/useAppData';
import { recurringSchedules, toMinutes } from '@/lib/focusSchedule';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const pad = (n) => String(n).padStart(2, '0');
const dateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// La giornata in ordine di orario: cosa c'e' alle 9, cosa alle 15, cosa non ha un orario.
// Mette insieme task ed eventi con orario, verifiche, allenamento del giorno e i programmi
// ricorrenti di Focus Time (con il lucchetto quando bloccano le app).
export default function AgendaDayView({ onAdd, onToggle }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: tasks } = useTasks();
  const { data: gymSessions } = useGymSessions();
  const { data: settings } = useUserSettings();
  const { data: verifiche } = useVerifiche();
  const { data: focusSessions } = useFocusSessions();
  const [day, setDay] = useState(() => new Date());

  const key = dateStr(day);
  const isToday = key === dateStr(new Date());
  const monIdx = (day.getDay() + 6) % 7; // 0 = lunedi', come i giorni dei task settimanali

  const { timed, untimed } = useMemo(() => {
    const timedItems = [];
    const untimedItems = [];

    for (const task of tasks || []) {
      if (task.status === 'archived') continue;
      const onDay = task.due_date === key || (task.type === 'weekly' && task.weekdays?.includes(monIdx));
      if (!onDay) continue;
      const item = { kind: 'task', id: task.id, task, title: task.title, done: task.status === 'done', start: task.due_time || null, end: task.end_time || null };
      (item.start ? timedItems : untimedItems).push(item);
    }

    for (const v of verifiche || []) {
      if (v.status === 'scheduled' && v.date === key) untimedItems.push({ kind: 'verifica', id: v.id, title: `${t('ag_verifica')}: ${v.subject}`, start: null });
    }

    if (settings?.gym_enabled) {
      const g = (gymSessions || []).find((s) => s.day_of_week === WEEKDAY_IDS[day.getDay()]);
      if (g) untimedItems.push({ kind: 'gym', id: `gym-${g.id}`, title: g.title || t('gsc_allenamento'), start: null });
    }

    for (const s of recurringSchedules(focusSessions)) {
      if (s.schedule_active === false || !s.repeat_days.includes(day.getDay())) continue;
      timedItems.push({ kind: 'focus', id: `focus-${s.id}`, title: s.title, start: s.start_time, end: s.end_time, locked: s.block_mode && s.block_mode !== 'off' });
    }

    timedItems.sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
    return { timed: timedItems, untimed: untimedItems };
  }, [tasks, verifiche, gymSessions, settings?.gym_enabled, focusSessions, key, monIdx, day, t]);

  const shift = (n) => setDay((d) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; });
  const label = isToday
    ? t('ag_oggi').replace(/^./, (c) => c.toUpperCase())
    : day.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  const icon = { task: Circle, verifica: CalendarCheck, gym: Dumbbell, focus: Clock };

  const Row = ({ item }) => {
    const Icon = item.kind === 'task' && item.task?.type === 'meeting' ? Users : icon[item.kind];
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5">
        {item.kind === 'task' ? (
          <button
            onClick={() => onToggle?.(item.task)}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${item.done ? 'border-foreground bg-foreground' : 'border-border'}`}
          >
            {item.done && <Check size={14} className="text-background" />}
          </button>
        ) : (
          <span className="flex h-6 w-6 shrink-0 items-center justify-center text-muted-foreground"><Icon size={16} /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-medium ${item.done ? 'text-muted-foreground line-through' : ''}`}>{item.title}</p>
        </div>
        {item.locked && <Lock size={13} className="shrink-0 text-muted-foreground" />}
      </div>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => shift(-1)} className="rounded-lg p-2 active:scale-95"><ChevronLeft size={20} /></button>
        <button onClick={() => setDay(new Date())} className="text-sm font-semibold capitalize">{label}</button>
        <button onClick={() => shift(1)} className="rounded-lg p-2 active:scale-95"><ChevronRight size={20} /></button>
      </div>

      {timed.length === 0 && untimed.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">{t('ag_giorno_vuoto')}</p>
          <button onClick={onAdd} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
            <Plus size={16} /> {t('aggiungi')}
          </button>
        </div>
      )}

      {timed.length > 0 && (
        <div className="space-y-2">
          {timed.map((item) => (
            <div key={item.id} className="flex items-stretch gap-3">
              <div className="w-14 shrink-0 pt-3.5 text-right">
                <p className="text-xs font-semibold tabular-nums">{item.start}</p>
                {item.end && <p className="text-[10px] tabular-nums text-muted-foreground">{item.end}</p>}
              </div>
              <div className="min-w-0 flex-1"><Row item={item} /></div>
            </div>
          ))}
        </div>
      )}

      {untimed.length > 0 && (
        <section className={timed.length > 0 ? 'mt-6' : ''}>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ag_senza_orario')}</h2>
          <div className="space-y-2">
            {untimed.map((item) => <Row key={item.id} item={item} />)}
          </div>
        </section>
      )}
    </div>
  );
}
