import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Target } from 'lucide-react';
import { useActivities, useRatings, useGoals, useOptimisticGoalToggle, useSubscription, useLessonGrades, useLifeStats, useUserSettings, useBodyFuelEntries, useWorkDayLogs } from '@/lib/useAppData';
import SubscriptionGate from '@/components/SubscriptionGate';
import { CATEGORIES } from '@/lib/constants';
import { computeCategoryRank } from '@/lib/productivity';
import { useT } from '@/lib/i18n';
import RankBadge from '@/components/RankBadge';
import GoalHistoryModal from '@/components/GoalHistoryModal';
import TutorialDialog from '@/components/TutorialDialog';
import MilestoneGrid from '@/components/MilestoneGrid';
import LifeStatsTab from '@/components/obiettivi/LifeStatsTab';
import GoalsListTab from '@/components/obiettivi/GoalsListTab';

export default function ObiettiviRanking() {
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const { data: lessonGrades } = useLessonGrades();
  const optimisticToggleGoal = useOptimisticGoalToggle();
  const sub = useSubscription();
  const { data: lifeStats } = useLifeStats();
  const { data: settings } = useUserSettings();
  const { data: bodyFuelEntries } = useBodyFuelEntries();
  const { data: workDayLogs } = useWorkDayLogs();
  const t = useT();
  const [calendarGoalId, setCalendarGoalId] = useState(null);
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab');
  const [tab, setTab] = useState(
    initialTab === 'lifestats' ? 'lifestats' : initialTab === 'goals' ? 'goals' : 'ranking'
  );

  if (!sub.canUseRankings) {
    return <SubscriptionGate title="LifeGame" description={t('gate_goals_desc')} icon={Target} />;
  }

  const handleToggleGoal = (goal) => optimisticToggleGoal(goal);
  const calendarGoal = (goals || []).find((g) => g.id === calendarGoalId) || null;

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-5">
        <h1 className="text-3xl font-bold tracking-tight">LifeGame</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('lg_sub')}</p>
      </header>

      <div className="mb-6 flex gap-1 rounded-full bg-foreground/[0.06] p-1">
        {[['goals', 'ob_obiettivi'], ['ranking', 'ob_titolo'], ['lifestats', 'stat_titolo']].map(([id, key]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${tab === id ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      {tab === 'goals' && <GoalsListTab onOpenHistory={setCalendarGoalId} />}

      {tab === 'lifestats' && <LifeStatsTab />}

      {tab === 'ranking' && (
      <>
      <div className="mb-7 grid grid-cols-3 gap-2.5">
        {CATEGORIES.map((cat) => {
          const rankInfo = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);

          return (
            <div key={cat.id} className="titanium-tile flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-border/70 p-2 text-center">
              <RankBadge rankId={rankInfo.rank?.id} size="lg" showName={false} />
              <p className="line-clamp-2 w-full text-[10px] font-semibold leading-tight">{t('cat_' + cat.id)}</p>
            </div>
          );
        })}
      </div>

      <MilestoneGrid activities={activities} ratings={ratings} goals={goals} lifeStats={lifeStats} bodyFuelEntries={bodyFuelEntries} workDayLogs={workDayLogs} settings={settings} lessonGrades={lessonGrades} />
      </>
      )}

      <GoalHistoryModal
        goal={calendarGoal}
        onClose={() => setCalendarGoalId(null)}
        onToggle={() => calendarGoal && handleToggleGoal(calendarGoal)}
      />
      <TutorialDialog pageId="obiettivi" />
    </div>
  );
}