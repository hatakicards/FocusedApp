import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useGoals, useOptimisticGoalToggle } from '@/lib/useAppData';
import { isGoalCompletedNow } from '@/lib/productivity';
import { useT } from '@/lib/i18n';
import GoalsListTab, { sortGoals } from '@/components/obiettivi/GoalsListTab';
import GoalHistoryModal from '@/components/GoalHistoryModal';

const OPEN_KEY = 'today_goals_open';

// Obiettivi in Oggi, sotto le abitudini: un menu a tendina ("Obiettivi 2/5") che si apre con un tocco
// e ricorda se l'avevi lasciato aperto. Prima quelli da fare, poi i completati. Senza obiettivi la
// sezione non c'e' (si creano dentro ogni abitudine).
export default function TodayGoals() {
  const t = useT();
  const { data: goals } = useGoals();
  const optimisticToggleGoal = useOptimisticGoalToggle();
  const [open, setOpen] = useState(() => {
    try { return localStorage.getItem(OPEN_KEY) === '1'; } catch { return false; }
  });
  const [historyId, setHistoryId] = useState(null);

  const list = sortGoals(goals);
  if (list.length === 0) return null;

  // Da fare prima, completati dopo; dentro ogni gruppo resta l'ordine per difficolta'.
  const pending = list.filter((g) => !isGoalCompletedNow(g));
  const done = list.filter((g) => isGoalCompletedNow(g));
  const historyGoal = list.find((g) => g.id === historyId) || null;

  const toggle = () => {
    setOpen((v) => {
      try { localStorage.setItem(OPEN_KEY, v ? '0' : '1'); } catch { /* ignore */ }
      return !v;
    });
  };

  return (
    <section>
      <button
        onClick={toggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left"
      >
        <span className="flex-1 text-sm font-semibold">{t('ob_obiettivi')}</span>
        <span className="text-xs tabular-nums text-muted-foreground">{done.length}/{list.length}</span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <GoalsListTab goals={[...pending, ...done]} onOpenHistory={setHistoryId} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <GoalHistoryModal
        goal={historyGoal}
        onClose={() => setHistoryId(null)}
        onToggle={() => historyGoal && optimisticToggleGoal(historyGoal)}
      />
    </section>
  );
}
