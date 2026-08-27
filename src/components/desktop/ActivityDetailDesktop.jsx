import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Check, Lock } from 'lucide-react';
import { useActivities, useRatings, useGoals, useOptimisticGoalToggle, useOptimisticRating, useOptimisticGoalDelete, useOptimisticActivityDelete, useSubscription, useUserSettings } from '@/lib/useAppData';
import { isMinor } from '@/lib/ageCheck';
import PremiumModal from '@/components/PremiumModal';
import { useT } from '@/lib/i18n';
import { DIFFICULTY_INFO } from '@/lib/constants';
import { computeStreak, computeLongestStreak, isGoalCompletedNow } from '@/lib/productivity';
import StreakBadge from '@/components/StreakBadge';
import RatingCalendar from '@/components/RatingCalendar';
import PieChartRating from '@/components/PieChartRating';
import BarChartRating from '@/components/BarChartRating';
import GoalForm from '@/components/GoalForm';
import ActivityForm from '@/components/ActivityForm';
import GymScheduleEditor from '@/components/GymScheduleEditor';
import PhoneTimeSection from '@/components/PhoneTimeSection';
import ReadingSection from '@/components/ReadingSection';
import QuitSmokingSection from '@/components/QuitSmokingSection';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function ActivityDetailDesktop() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const optimisticToggleGoal = useOptimisticGoalToggle();
  const optimisticDeleteGoal = useOptimisticGoalDelete();
  const optimisticRate = useOptimisticRating();
  const optimisticDeleteActivity = useOptimisticActivityDelete();
  const t = useT();
  const [goalFormOpen, setGoalFormOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const sub = useSubscription();
  const { data: settings } = useUserSettings();
  const userIsMinor = isMinor(settings?.birth_date);

  const activity = (activities || []).find((a) => a.id === id);

  const aRatings = useMemo(() => (ratings || []).filter((r) => r.activity_id === id), [ratings, id]);
  const aGoals = useMemo(() => (goals || []).filter((g) => g.activity_id === id), [goals, id]);

  if (activity && activity.preset_type === 'quit_smoking' && userIsMinor) {
    return (
      <div className="safe-top px-5">
        <button onClick={() => navigate(-1)} className="mb-4 -ml-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </button>
        <p className="text-muted-foreground text-sm">{t('detail_non_trovata')}</p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="safe-top px-5">
        <button onClick={() => navigate(-1)} className="mb-4 text-muted-foreground">
          <ArrowLeft size={20} />
        </button>
        <p className="text-muted-foreground text-sm">{t('detail_non_trovata')}</p>
      </div>
    );
  }

  const streak = computeStreak(aRatings);
  const longestStreak = computeLongestStreak(aRatings);
  const catName = activity.category === 'custom'
    ? activity.custom_category_name || t('riep_personalizzata')
    : t('cat_' + activity.category);

  const handleSaveRating = (date, rating) => optimisticRate(id, date, rating);
  const handleToggleGoal = (goal) => optimisticToggleGoal(goal);
  const handleDeleteGoal = (goalId) => optimisticDeleteGoal(goalId).catch(console.error);

  const handleDeleteActivity = () => {
    setDeleteConfirmOpen(false);
    optimisticDeleteActivity(activity.id).catch(console.error);
    navigate('/abitudini');
  };

  return (
    <div className="safe-top px-5 pb-8">
      <div className="max-w-5xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-4 -ml-1 text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft size={20} />
        </button>

        <header className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{activity.name}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">{catName}</span>
              <span className="text-muted-foreground/30">·</span>
              <StreakBadge streak={streak} size="sm" />
              {longestStreak > streak && (
                <>
                  <span className="text-muted-foreground/30">·</span>
                  <span className="text-xs text-muted-foreground">{t('detail_record')}: {longestStreak}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              onClick={() => setEditOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {/* Preset sections ABOVE everything */}
        {activity.preset_type === 'phone_time' && <PhoneTimeSection activityId={activity.id} />}
        {activity.preset_type === 'reading' && <ReadingSection activityId={activity.id} />}
        {activity.preset_type === 'quit_smoking' && <QuitSmokingSection activityId={activity.id} />}
        {activity.is_gym && (
          <button
            onClick={() => sub.isPro ? setScheduleOpen(true) : setShowPremium(true)}
            className="mb-6 w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between hover:bg-accent transition-colors"
          >
            <span className="text-sm font-semibold">{t('detail_scheda')}</span>
            {sub.isPro ? <span className="text-xs text-muted-foreground">{t('modifica')}</span> : <Lock size={16} className="text-muted-foreground" />}
          </button>
        )}

        {/* Two columns: charts left, calendar+goals right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: two charts stacked */}
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail_distribuzione')}</h2>
              <div className="rounded-2xl border border-border bg-card p-4">
                <PieChartRating ratings={aRatings} />
              </div>
            </section>
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail_andamento')}</h2>
              <div className="rounded-2xl border border-border bg-card p-4">
                <BarChartRating ratings={aRatings} category={activity.category} />
              </div>
            </section>
          </div>

          {/* RIGHT: calendar + goals below */}
          <div className="space-y-6">
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail_calendario')}</h2>
              <div className="rounded-2xl border border-border bg-card p-4">
                <RatingCalendar ratings={aRatings} onSaveRating={handleSaveRating} />
              </div>
            </section>
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail_obiettivi')}</h2>
                <button onClick={() => setGoalFormOpen(true)} className="flex items-center gap-1 text-xs font-medium text-foreground">
                  <Plus size={14} /> {t('aggiungi')}
                </button>
              </div>
              {aGoals.length === 0 ? (
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t('detail_nessun_obiettivo')}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {aGoals.map((goal) => {
                    const diff = DIFFICULTY_INFO[goal.difficulty];
                    const completedNow = isGoalCompletedNow(goal);
                    return (
                      <div key={goal.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3">
                        <button
                          onClick={() => handleToggleGoal(goal)}
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors"
                          style={{ borderColor: completedNow ? diff.color : 'hsl(0 0% 30%)', backgroundColor: completedNow ? diff.color : 'transparent' }}
                        >
                          {completedNow && <Check size={14} className="text-background" strokeWidth={3} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm font-medium ${completedNow ? 'line-through text-muted-foreground' : ''}`}>{goal.title}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: diff.color + '20', color: diff.color }}>
                              {t('diff_' + goal.difficulty)}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{t('tf_' + goal.timeframe)}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDeleteGoal(goal.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>

        <GoalForm open={goalFormOpen} onClose={() => setGoalFormOpen(false)} activityId={id} />
        <GymScheduleEditor open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
        <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
        <ActivityForm open={editOpen} onClose={() => setEditOpen(false)} activity={activity} />

        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('at_elimina_title').replace('{name}', activity.name)}</AlertDialogTitle>
              <AlertDialogDescription>{t('at_elimina_desc')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('annulla')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteActivity();
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('elimina')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}