import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, Target } from 'lucide-react';
import { useActivities, useRatings, useGoals, useOptimisticGoalToggle, useSubscription, useLessonGrades, useLifeStats, useUserSettings, useBodyFuelEntries, useWorkDayLogs } from '@/lib/useAppData';
import SubscriptionGate from '@/components/SubscriptionGate';
import { CATEGORIES, DIFFICULTY_INFO } from '@/lib/constants';
import { computeCategoryRank, isGoalCompletedNow } from '@/lib/productivity';
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
  const [expanded, setExpanded] = useState(null);
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
          const isOpen = expanded === cat.id;
          const catActivities = (activities || []).filter((a) => a.category === cat.id);
          const catActivityIds = new Set(catActivities.map((a) => a.id));
          const catGoals = (goals || []).filter((g) => catActivityIds.has(g.activity_id));

          return (
            <div key={cat.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : cat.id)}
                className="flex w-full items-center justify-between p-4 hover:bg-accent/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <RankBadge rankId={rankInfo.rank?.id} size="md" showName={false} />
                  <div className="text-left">
                    <p className="text-sm font-semibold">{t('cat_' + cat.id)}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {rankInfo.rank ? t('rank_' + rankInfo.rank.id) : t('nessun_rank')}
                      </span>
                      <span className="text-muted-foreground/30">·</span>
                      <span className="text-xs text-muted-foreground">
                        {rankInfo.completedCount}/{rankInfo.requirements.length}
                      </span>
                    </div>
                  </div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}
              </button>

              {isOpen && (
                <div className="border-t border-border px-4 py-3 space-y-4">
                  {/* Requirements */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('ob_requisiti')}</p>
                    {rankInfo.requirements.map((req, i) => (
                      <div key={req.id} className="flex items-center gap-2">
                        <div
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            req.completed ? 'bg-foreground border-foreground' : 'border-muted-foreground/40'
                          }`}
                        >
                          {req.completed && <Check size={10} className="text-background" strokeWidth={3} />}
                        </div>
                        <span className={`text-xs ${req.completed ? 'text-muted-foreground line-through' : ''}`}>
                          {t('req_' + cat.id + '_' + req.id)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Goals */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('ob_obiettivi')}</p>
                    {catGoals.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60">{t('ob_nessun_obiettivo')}</p>
                    ) : (
                      catGoals.map((goal) => {
                        const diff = DIFFICULTY_INFO[goal.difficulty];
                        const activityName = catActivities.find((a) => a.id === goal.activity_id)?.name || '';
                        const isCompletedNow = isGoalCompletedNow(goal);
                        return (
                          <div key={goal.id} className="flex items-center gap-2.5">
                            <button
                              onClick={() => handleToggleGoal(goal)}
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-90"
                              style={{
                                borderColor: isCompletedNow ? diff.color : 'hsl(0 0% 30%)',
                                backgroundColor: isCompletedNow ? diff.color : 'transparent',
                              }}
                            >
                              {isCompletedNow && <Check size={14} className="text-background" strokeWidth={3} />}
                            </button>
                            <button
                              onClick={() => setCalendarGoalId(goal.id)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <span className={`text-xs font-medium ${isCompletedNow ? 'line-through text-muted-foreground' : ''}`}>
                                {goal.title}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground/60">{activityName}</span>
                                <span className="text-muted-foreground/20">·</span>
                                <span
                                  className="text-[9px] px-1 rounded font-medium"
                                  style={{ backgroundColor: diff.color + '20', color: diff.color }}
                                >
                                  {t('diff_' + goal.difficulty)}
                                </span>
                              </div>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
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