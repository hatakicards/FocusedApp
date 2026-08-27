import { useState, useEffect, useMemo } from 'react';
import { MILESTONES, checkMilestone } from '@/lib/milestones';
import { useActivities, useRatings, useGoals, useLifeStats, useBodyFuelEntries, useWorkDayLogs, useUserSettings, useLessonGrades } from '@/lib/useAppData';
import MilestoneUnlockAnimation from '@/components/MilestoneUnlockAnimation';

export default function MilestoneChecker() {
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const { data: lifeStats } = useLifeStats();
  const { data: bodyFuelEntries } = useBodyFuelEntries();
  const { data: workDayLogs } = useWorkDayLogs();
  const { data: settings } = useUserSettings();
  const { data: lessonGrades } = useLessonGrades();
  const [unlockAnim, setUnlockAnim] = useState(null);

  const milestoneStatuses = useMemo(
    () =>
      MILESTONES.map((m) => ({
        ...m,
        unlocked: checkMilestone(m.id, { activities, ratings, goals, lifeStats, bodyFuelEntries, workDayLogs, settings, lessonGrades }),
      })),
    [activities, ratings, goals, lifeStats, bodyFuelEntries, workDayLogs, settings, lessonGrades]
  );

  useEffect(() => {
    const newlyUnlocked = milestoneStatuses.find((m) => {
      const stored = localStorage.getItem(`milestone_${m.id}`);
      return m.unlocked && !stored;
    });
    if (newlyUnlocked) {
      localStorage.setItem(`milestone_${newlyUnlocked.id}`, '1');
      setUnlockAnim(newlyUnlocked);
    }
  }, [milestoneStatuses]);

  return <MilestoneUnlockAnimation milestone={unlockAnim} onClose={() => setUnlockAnim(null)} />;
}