import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUp, ArrowDown, Minus, X, Check } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useInvalidateAll, useUserSettings, useGoals, useTasks, useActivities, useOptimisticGoalPeriod } from '@/lib/useAppData';
import { periodKey } from '@/lib/productivity';
import { useT } from '@/lib/i18n';
import { getLifeStatsForProfile, defaultScores } from '@/lib/statsConfig';
import StatSliders from './StatSliders';

const addDays = (dateStr, n) => {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// Recap della settimana: prima le statistiche, poi gli obiettivi settimanali che hai completato e le
// attivita' rimaste indietro (da rimettere nella settimana che arriva), infine il risultato.
export default function WeeklyReviewModal({ baseline, onClose }) {
  const invalidate = useInvalidateAll();
  const { data: settings } = useUserSettings();
  const t = useT();
  const [step, setStep] = useState('input');
  const [values, setValues] = useState(defaultScores());
  const [saving, setSaving] = useState(false);
  const { data: goals } = useGoals();
  const { data: tasks } = useTasks();
  const { data: activities } = useActivities();
  const optimisticGoalPeriod = useOptimisticGoalPeriod();
  const [skipped, setSkipped] = useState({}); // id -> true se l'utente toglie la spunta
  const [moving, setMoving] = useState(false);

  // Settimana appena conclusa: da lunedi' a domenica di quella precedente a questa.
  const lastMonday = periodKey(addDays(new Date().toISOString().split('T')[0], -7), 'weekly');
  const lastSunday = addDays(lastMonday, 6);
  const liveActivities = new Set((activities || []).filter((a) => !a.archived).map((a) => a.id));
  const weeklyGoals = (goals || []).filter((g) => g.timeframe === 'weekly' && liveActivities.has(g.activity_id));
  const leftovers = (tasks || []).filter((x) => x.status === 'active' && x.type !== 'weekly'
    && x.due_date && x.due_date >= lastMonday && x.due_date <= lastSunday);

  const nextAfterStats = () => (weeklyGoals.length ? 'goals' : leftovers.length ? 'tasks' : 'result');
  const nextAfterGoals = () => (leftovers.length ? 'tasks' : 'result');

  const moveLeftovers = async () => {
    setMoving(true);
    try {
      for (const task of leftovers) {
        if (skipped[task.id]) continue;
        await getDB().TaskItem.update(task.id, { due_date: addDays(task.due_date, 7) });
      }
      invalidate();
    } catch (e) {
      console.error(e);
    } finally {
      setMoving(false);
      setStep('result');
    }
  };

  const profileType = settings?.profile_type || 'base';
  const stats = getLifeStatsForProfile(profileType);

  const handleSave = async () => {
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      await getDB().LifeStat.create({ date: today, ...values, is_baseline: false });
      invalidate();
    } finally {
      setSaving(false);
      setStep(nextAfterStats());
    }
  };

  const deltas = stats.map((s) => ({
    ...s,
    delta: (values[s.id] ?? 0) - (baseline?.[s.id] ?? 0),
  }));
  const totalDelta = deltas.reduce((sum, d) => sum + d.delta, 0);

  const message = totalDelta > 0 ? t('wr_msg_pos') : totalDelta < 0 ? t('wr_msg_neg') : t('wr_msg_neu');

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto px-5 safe-top pb-10">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-card border border-border text-muted-foreground"
      >
        <X size={16} />
      </button>

      <AnimatePresence mode="wait">
        {step === 'input' ? (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pt-8"
          >
            <h1 className="text-2xl font-bold tracking-tight mb-2">{t('wr_titolo')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('wr_desc')}</p>
            <div className="rounded-2xl border border-border bg-card p-5 mb-6">
              <StatSliders values={values} onChange={setValues} disabled={saving} profileType={profileType} />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              {saving ? t('salvataggio') : t('wr_vedi')}
            </button>
          </motion.div>
        ) : step === 'goals' ? (
          <motion.div
            key="goals"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pt-8"
          >
            <h1 className="text-2xl font-bold tracking-tight mb-2">{t('wr_goals_t')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('wr_goals_d')}</p>
            <div className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-3">
              {weeklyGoals.map((goal) => {
                const done = (goal.completed_periods || []).includes(lastMonday);
                return (
                  <button key={goal.id} onClick={() => optimisticGoalPeriod(goal, lastMonday, !done)} className="flex w-full items-center gap-3 text-left">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${done ? 'bg-foreground border-foreground' : 'border-border'}`}>
                      {done && <Check size={14} className="text-background" />}
                    </span>
                    <span className="min-w-0 flex-1 text-sm">{goal.title}</span>
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep(nextAfterGoals())} className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background">
              {t('wr_next')}
            </button>
          </motion.div>
        ) : step === 'tasks' ? (
          <motion.div
            key="tasks"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pt-8"
          >
            <h1 className="text-2xl font-bold tracking-tight mb-2">{t('wr_tasks_t')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('wr_tasks_d')}</p>
            <div className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-3">
              {leftovers.map((task) => {
                const picked = !skipped[task.id];
                return (
                  <button key={task.id} onClick={() => setSkipped((m) => ({ ...m, [task.id]: picked }))} className="flex w-full items-center gap-3 text-left">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${picked ? 'bg-foreground border-foreground' : 'border-border'}`}>
                      {picked && <Check size={14} className="text-background" />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm">{task.title}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={moveLeftovers}
              disabled={moving}
              className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              {t('wr_tasks_move')}
            </button>
            <button onClick={() => setStep('result')} className="mt-3 w-full rounded-xl border border-border py-3 text-sm font-semibold">
              {t('wr_tasks_skip')}
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="pt-8"
          >
            <h1 className="text-2xl font-bold tracking-tight mb-1">{t('wr_tuoi')}</h1>
            <p className="text-sm text-muted-foreground mb-6">{t('wr_dal')}</p>

            <div className="rounded-2xl border border-border bg-card p-5 mb-6 space-y-4">
              {deltas.map((d) => {
                const Icon = d.icon;
                const up = d.delta > 0;
                const down = d.delta < 0;
                return (
                  <div key={d.id} className="flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border"
                      style={{ color: d.color }}
                    >
                      <Icon size={18} />
                    </div>
                    <span className="flex-1 text-sm font-medium">{t('stat_' + d.id)}</span>
                    <div className="flex items-center gap-1 text-sm font-semibold tabular-nums">
                      {up ? (
                        <ArrowUp size={15} className="text-emerald-500" />
                      ) : down ? (
                        <ArrowDown size={15} className="text-red-500" />
                      ) : (
                        <Minus size={15} className="text-muted-foreground" />
                      )}
                      <span className={up ? 'text-emerald-500' : down ? 'text-red-500' : 'text-muted-foreground'}>
                        {up ? '+' : ''}
                        {d.delta}
                      </span>
                    </div>
                  </div>
                );
              })}

              <div className="border-t border-border pt-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{t('wr_totale')}</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    totalDelta > 0 ? 'text-emerald-500' : totalDelta < 0 ? 'text-red-500' : 'text-muted-foreground'
                  }`}
                >
                  {totalDelta > 0 ? '+' : ''}
                  {totalDelta}
                </span>
              </div>
            </div>

            <p className="text-center text-sm text-muted-foreground mb-6">{message}</p>

            <button
              onClick={onClose}
              className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background"
            >
              {t('continua')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}