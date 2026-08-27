import { CalendarClock, Users, Clock } from 'lucide-react';
import { useTasks } from '@/lib/useAppData';
import { useT, useI18n } from '@/lib/i18n';

function toLocalDateStr(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export default function WorkspaceUpcoming() {
  const t = useT();
  const { locale } = useI18n();
  const { data: tasks } = useTasks();

  const todayStr = toLocalDateStr(new Date());

  // Only show workspace-specific items: meetings and deadlines (distinct types).
  // Regular todos and one-time events are excluded.
  const deadlines = (tasks || [])
    .filter((task) =>
      task.status === 'active' &&
      task.due_date &&
      task.due_date >= todayStr &&
      (task.type === 'meeting' || task.type === 'deadline')
    )
    .map((task) => ({
      type: task.type === 'meeting' ? 'meeting' : 'deadline',
      date: task.due_date,
      title: task.title,
      expectedEarnings: task.expected_earnings || 0,
    }));

  const all = [...deadlines].sort((a, b) => a.date.localeCompare(b.date));

  if (all.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <CalendarClock size={12} /> {t('ws_upcoming')}
      </h2>
      <div className="space-y-2">
        {all.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2.5 rounded-lg bg-foreground/5 px-3 py-2">
            {item.type === 'meeting' ? (
              <Users size={15} className="text-blue-400 shrink-0" />
            ) : (
              <Clock size={15} className="text-amber-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.title}</p>
              <p className="text-[11px] text-muted-foreground capitalize">
                {new Date(item.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                {item.time && ` · ${item.time}`}
                {item.duration > 0 && ` · ${item.duration}h`}
                {item.expectedEarnings > 0 && ` · €${item.expectedEarnings}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}