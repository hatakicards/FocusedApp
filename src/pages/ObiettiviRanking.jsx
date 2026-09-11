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
      <header className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">LifeGame</h1>
      </header>

      <div className="flex gap-1 p-1 rounded-xl bg-muted mb-6 w-fit overflow-x-auto scrollbar-hide">
        <button
          onClick={() => setTab('goals')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            tab === 'goals' ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          {t('ob_obiettivi')}
        </button>
        <button
          onClick={() => setTab('ranking')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            tab === 'ranking' ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          {t('ob_titolo')}
        </button>
        <button
          onClick={() => setTab('lifestats')}
          className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
            tab === 'lifestats' ? 'bg-foreground text-background' : 'text-muted-foreground'
          }`}
        >
          {t('stat_titolo')}
        </button>
      </div>

      {tab === 'goals' && <GoalsListTab onOpenHistory={setCalendarGoalId} />}

      {tab === 'lifestats' && <LifeStatsTab />}

      {tab === 'ranking' && (
      <>
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const rankInfo = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);

          return (
            <div key={cat.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex w-full items-center gap-4 p-4">
                <RankBadge rankId={rankInfo.rank?.id} size="md" showName={false} />
                <div className="text-left">
                  <p className="text-sm font-semibold">{t('cat_' + cat.id)}</p>
                  <span className="text-xs text-muted-foreground">
                    {rankInfo.rank ? t('rank_' + rankInfo.rank.id) : t('nessun_rank')}
                  </span>
                </div>
              </div>
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