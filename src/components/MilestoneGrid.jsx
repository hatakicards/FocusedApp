import { useState, useMemo } from 'react';
import { useT } from '@/lib/i18n';
import { MILESTONES, checkMilestone } from '@/lib/milestones';
import MilestoneDialog from '@/components/MilestoneDialog';
import MilestoneIcon from '@/components/MilestoneIcon';

export default function MilestoneGrid({ activities, ratings, goals, lifeStats, bodyFuelEntries, workDayLogs, settings, lessonGrades }) {
  const t = useT();
  const [selected, setSelected] = useState(null);

  const milestoneStatuses = useMemo(
    () =>
      MILESTONES.map((m) => ({
        ...m,
        unlocked: checkMilestone(m.id, { activities, ratings, goals, lifeStats, bodyFuelEntries, workDayLogs, settings, lessonGrades }),
      })),
    [activities, ratings, goals, lifeStats, bodyFuelEntries, workDayLogs, settings, lessonGrades]
  );

  return (
    <>
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('ms_title')}</p>
        <div className="grid grid-cols-3 gap-2.5">
          {milestoneStatuses.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-card p-2.5 active:scale-95 transition-transform"
            >
              <div className="aspect-square w-14 rounded-lg overflow-hidden flex items-center justify-center">
                <MilestoneIcon icon={m.icon} unlocked={m.unlocked} size={56} />
              </div>
              <span className={`text-[8px] text-center leading-tight line-clamp-2 ${m.unlocked ? 'text-foreground font-medium' : 'text-muted-foreground/50'}`}>
                {t(m.titleKey)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <MilestoneDialog milestone={selected} onClose={() => setSelected(null)} />
    </>
  );
}