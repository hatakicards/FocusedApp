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
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('ms_title')}</p>
        <div className="grid grid-cols-3 gap-2.5">
          {milestoneStatuses.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m)}
              className="titanium-tile flex flex-col items-center gap-2 rounded-2xl border border-border/70 p-3 active:scale-95 transition-transform"
            >
              <div className="flex aspect-square w-14 items-center justify-center">
                <MilestoneIcon icon={m.icon} unlocked={m.unlocked} size={56} />
              </div>
              <span className={`text-[9px] text-center leading-tight line-clamp-2 ${m.unlocked ? 'text-foreground font-medium' : 'text-muted-foreground/50'}`}>
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