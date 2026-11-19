import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '@/lib/i18n';
import { useActivities, useSmallHabitLogs, useSmallHabits } from '@/lib/useAppData';
import { useActivityLimit } from '@/lib/activityLimit';
import { computeHabitStreak, indexLogs, isScheduled, isSlotDone, restoreInfo } from '@/lib/smallHabits';
import { todayISO } from '@/lib/productivity';
import HabitRow from '@/components/habits/HabitRow';
import { useHabitActions } from '@/components/habits/useHabitActions';

// Oggi: le Small Habits previste per oggi, in ordine di orario (quelle senza orario in fondo).
// Senza abitudini la sezione non c'e': si creano dentro ogni attivita'.
export default function TodayHabits() {
  const t = useT();
  const navigate = useNavigate();
  const { data: activities } = useActivities();
  const { data: habits } = useSmallHabits();
  const { data: logs } = useSmallHabitLogs();
  const limit = useActivityLimit();
  const { toggle, restore } = useHabitActions();
  const today = todayISO();

  const rows = useMemo(() => {
    const byId = new Map((activities || []).filter((a) => !a.archived).map((a) => [a.id, a]));
    return (habits || [])
      .filter((h) => !h.archived && byId.has(h.activity_id) && !limit.isLocked(h.activity_id) && isScheduled(h, today))
      .map((h) => {
        const index = indexLogs(logs, h.id);
        const times = (h.times || []).length ? h.times : [null];
        return {
          habit: h,
          activity: byId.get(h.activity_id),
          slots: times.map((time, slot) => ({ slot, time, done: isSlotDone(index, today, slot) })),
          first: h.times?.[0] || '99:99',
        };
      })
      .sort((a, b) => a.first.localeCompare(b.first) || String(a.habit.name).localeCompare(String(b.habit.name)));
  }, [activities, habits, logs, limit, today]);

  if (rows.length === 0) return null;

  const totalSlots = rows.reduce((n, r) => n + r.slots.length, 0);
  const doneSlots = rows.reduce((n, r) => n + r.slots.filter((s) => s.done).length, 0);

  return (
    <section>
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold">{t('sh_today_title')}</h2>
        <span className="text-xs tabular-nums text-muted-foreground">{doneSlots}/{totalSlots}</span>
      </div>
      <div className="space-y-2">
        {rows.map(({ habit, activity, slots }) => {
          const info = restoreInfo(habit, logs, today);
          return (
            <HabitRow
              key={habit.id}
              habit={habit}
              subtitle={activity?.name}
              slots={slots}
              streak={computeHabitStreak(habit, logs, today)}
              restore={info}
              onToggle={(slot) => toggle(habit, slot, today)}
              onRestore={() => info && restore(habit, info.missedDate)}
              onOpen={() => navigate(`/attivita/${habit.activity_id}`)}
            />
          );
        })}
      </div>
    </section>
  );
}
