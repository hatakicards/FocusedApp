import { Check } from 'lucide-react';
import { useActivities, useGoals, useOptimisticGoalToggle } from '@/lib/useAppData';
import { DIFFICULTY_INFO } from '@/lib/constants';
import { isGoalCompletedNow } from '@/lib/productivity';
import { useT } from '@/lib/i18n';

const DIFFICULTY_ORDER = ['easy', 'medium', 'hard'];

// Lista piatta di tutti gli obiettivi (di ogni categoria/attivita'), ordinati
// dal piu' facile al piu' difficile — a differenza del tab Ranking, dove gli
// obiettivi sono nascosti dentro ogni categoria espandibile.
export default function GoalsListTab({ onOpenHistory }) {
  const t = useT();
  const { data: activities } = useActivities();
  const { data: goals } = useGoals();
  const optimisticToggleGoal = useOptimisticGoalToggle();

  const sorted = [...(goals || [])].sort((a, b) => {
    const diffDelta = DIFFICULTY_ORDER.indexOf(a.difficulty) - DIFFICULTY_ORDER.indexOf(b.difficulty);
    if (diffDelta !== 0) return diffDelta;
    return (a.title || '').localeCompare(b.title || '');
  });

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{t('ob_nessun_obiettivo')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sorted.map((goal) => {
        const diff = DIFFICULTY_INFO[goal.difficulty];
        const activity = (activities || []).find((a) => a.id === goal.activity_id);
        const isCompletedNow = isGoalCompletedNow(goal);
        return (
          <div key={goal.id} className="flex items-center gap-2.5 rounded-2xl border border-border bg-card p-3">
            <button
              onClick={() => optimisticToggleGoal(goal)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors active:scale-90"
              style={{
                borderColor: isCompletedNow ? diff.color : 'hsl(0 0% 30%)',
                backgroundColor: isCompletedNow ? diff.color : 'transparent',
              }}
            >
              {isCompletedNow && <Check size={15} className="text-background" strokeWidth={3} />}
            </button>
            <button onClick={() => onOpenHistory(goal.id)} className="flex-1 min-w-0 text-left">
              <span className={`text-sm font-medium ${isCompletedNow ? 'line-through text-muted-foreground' : ''}`}>
                {goal.title}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] text-muted-foreground/60 truncate">{activity?.name || ''}</span>
                <span className="text-muted-foreground/20 shrink-0">·</span>
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0"
                  style={{ backgroundColor: diff.color + '20', color: diff.color }}
                >
                  {t('diff_' + goal.difficulty)}
                </span>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
