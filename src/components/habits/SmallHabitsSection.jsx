import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useSmallHabitLogs, useSmallHabits } from '@/lib/useAppData';
import { computeHabitStreak, indexLogs, isScheduled, isSlotDone, restoreInfo } from '@/lib/smallHabits';
import { todayISO } from '@/lib/productivity';
import HabitRow from './HabitRow';
import SmallHabitForm from './SmallHabitForm';
import { useHabitActions } from './useHabitActions';

// Small Habits dentro la pagina di un'attivita': elenco, spunta di oggi, streak, recupero e "Aggiungi".
export default function SmallHabitsSection({ activity }) {
  const t = useT();
  const { data: habits } = useSmallHabits();
  const { data: logs } = useSmallHabitLogs();
  const { toggle, restore } = useHabitActions();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const today = todayISO();

  const list = useMemo(
    () => (habits || [])
      .filter((h) => h.activity_id === activity.id && !h.archived)
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || String(a.created_date || '').localeCompare(String(b.created_date || ''))),
    [habits, activity.id],
  );

  const openNew = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (h) => { setEditing(h); setFormOpen(true); };

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('sh_title')}</h2>
        <button onClick={openNew} className="flex items-center gap-1 text-xs font-medium text-foreground">
          <Plus size={14} /> {t('sh_add')}
        </button>
      </div>

      {list.length === 0 ? (
        <button
          type="button"
          onClick={openNew}
          className="w-full rounded-2xl border border-dashed border-border bg-card p-4 text-left transition-colors active:bg-accent"
        >
          <p className="text-sm text-muted-foreground">{t('sh_empty')}</p>
          <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold"><Plus size={15} /> {t('sh_new')}</span>
        </button>
      ) : (
        <div className="space-y-2">
          {list.map((h) => {
            const index = indexLogs(logs, h.id);
            const scheduled = isScheduled(h, today);
            const times = (h.times || []).length ? h.times : [null];
            const slots = scheduled ? times.map((time, slot) => ({ slot, time, done: isSlotDone(index, today, slot) })) : [];
            const info = restoreInfo(h, logs, today);
            return (
              <HabitRow
                key={h.id}
                habit={h}
                subtitle={!scheduled ? (h.times || []).join(' · ') : null}
                slots={slots}
                streak={computeHabitStreak(h, logs, today)}
                restore={info}
                onToggle={(slot) => toggle(h, slot, today)}
                onRestore={() => info && restore(h, info.missedDate)}
                onEdit={() => openEdit(h)}
              />
            );
          })}
        </div>
      )}

      <SmallHabitForm open={formOpen} onClose={() => setFormOpen(false)} activity={activity} habit={editing} />
    </section>
  );
}
