import { useState } from 'react';
import { Check, Target, ChevronDown } from 'lucide-react';
import { useActivities, useRatings, useGoals, useOptimisticGoalToggle, useSubscription, useLessonGrades, useLifeStats, useUserSettings, useBodyFuelEntries, useWorkDayLogs } from '@/lib/useAppData';
import SubscriptionGate from '@/components/SubscriptionGate';
import { CATEGORIES, DIFFICULTY_INFO } from '@/lib/constants';
import { computeCategoryRank, isGoalCompletedNow } from '@/lib/productivity';
import { useT } from '@/lib/i18n';
import RankBadge from '@/components/RankBadge';
import GoalHistoryModal from '@/components/GoalHistoryModal';
import MilestoneGrid from '@/components/MilestoneGrid';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function ObiettiviDesktop() {
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
  const [selectedCat, setSelectedCat] = useState(null);
  const [calendarGoalId, setCalendarGoalId] = useState(null);

  if (!sub.canUseRankings) {
    return <SubscriptionGate title={t('ob_titolo')} description={t('gate_goals_desc')} icon={Target} />;
  }

  const handleToggleGoal = (goal) => optimisticToggleGoal(goal);
  const calendarGoal = (goals || []).find((g) => g.id === calendarGoalId) || null;
  const catData = selectedCat ? (() => {
    const rankInfo = computeCategoryRank(selectedCat, activities || [], ratings || [], goals || [], lessonGrades || []);
    const catActivities = (activities || []).filter((a) => a.category === selectedCat);
    const catActivityIds = new Set(catActivities.map((a) => a.id));
    const catGoals = (goals || []).filter((g) => catActivityIds.has(g.activity_id));
    return { rankInfo, catActivities, catGoals };
  })() : null;

  return (
    <div className="safe-top px-5 pb-8">
      <div className="max-w-5xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">{t('ob_titolo')}</h1>
        </header>

        {/* Category squares - 2 rows of 3 */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {CATEGORIES.map((cat) => {
            const rankInfo = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCat(cat.id)}
                className="aspect-square rounded-3xl border border-border bg-card p-4 flex flex-col items-center justify-center gap-3 hover:border-foreground/30 transition-colors active:scale-[0.98] transition-transform"
              >
                <RankBadge rankId={rankInfo.rank?.id} size="lg" showName={false} />
                <div className="text-center">
                  <p className="text-sm font-semibold">{t('cat_' + cat.id)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {rankInfo.rank ? t('rank_' + rankInfo.rank.id) : t('nessun_rank')}
                  </p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    {rankInfo.completedCount}/{rankInfo.requirements.length}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <MilestoneGrid activities={activities} ratings={ratings} goals={goals} lifeStats={lifeStats} bodyFuelEntries={bodyFuelEntries} workDayLogs={workDayLogs} settings={settings} lessonGrades={lessonGrades} />

        <GoalHistoryModal
          goal={calendarGoal}
          onClose={() => setCalendarGoalId(null)}
          onToggle={() => calendarGoal && handleToggleGoal(calendarGoal)}
        />
      </div>

      {/* Category popup */}
      <Dialog open={!!selectedCat} onOpenChange={(open) => !open && setSelectedCat(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedCat ? t('cat_' + selectedCat) : ''}</DialogTitle>
          </DialogHeader>
          {catData && (
            <div className="space-y-4">
              {/* Requirements */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('ob_requisiti')}</p>
                {catData.rankInfo.requirements.map((req) => (
                  <div key={req.id} className="flex items-center gap-2">
                    <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${req.completed ? 'bg-foreground border-foreground' : 'border-muted-foreground/40'}`}>
                      {req.completed && <Check size={10} className="text-background" strokeWidth={3} />}
                    </div>
                    <span className={`text-xs ${req.completed ? 'text-muted-foreground line-through' : ''}`}>
                      {t('req_' + selectedCat + '_' + req.id)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Goals */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('ob_obiettivi')}</p>
                {catData.catGoals.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">{t('ob_nessun_obiettivo')}</p>
                ) : (
                  catData.catGoals.map((goal) => {
                    const diff = DIFFICULTY_INFO[goal.difficulty];
                    const activityName = catData.catActivities.find((a) => a.id === goal.activity_id)?.name || '';
                    const isCompletedNow = isGoalCompletedNow(goal);
                    return (
                      <div key={goal.id} className="flex items-center gap-2.5">
                        <button
                          onClick={() => handleToggleGoal(goal)}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-90"
                          style={{ borderColor: isCompletedNow ? diff.color : 'hsl(0 0% 30%)', backgroundColor: isCompletedNow ? diff.color : 'transparent' }}
                        >
                          {isCompletedNow && <Check size={14} className="text-background" strokeWidth={3} />}
                        </button>
                        <button onClick={() => setCalendarGoalId(goal.id)} className="flex-1 min-w-0 text-left">
                          <span className={`text-xs font-medium ${isCompletedNow ? 'line-through text-muted-foreground' : ''}`}>{goal.title}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground/60">{activityName}</span>
                            <span className="text-muted-foreground/20">·</span>
                            <span className="text-[9px] px-1 rounded font-medium" style={{ backgroundColor: diff.color + '20', color: diff.color }}>
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
        </DialogContent>
      </Dialog>
    </div>
  );
}