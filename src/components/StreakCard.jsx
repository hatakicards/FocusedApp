import { motion } from 'framer-motion';
import { Flame, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useAppStreak } from '@/lib/appStreak';

// Serie di giorni di fila sulla home: il motivo piu' semplice per tornare domani.
export default function StreakCard({ className = '' }) {
  const t = useT();
  const { streak, doneToday } = useAppStreak();
  const title = streak <= 0
    ? t('streak_keep')
    : streak === 1 ? t('streak_day1') : t('streak_days').replace('{n}', String(streak));

  return (
    <div className={`flex items-center gap-3 rounded-2xl border border-border bg-card p-4 ${className}`}>
      <motion.div
        animate={streak > 0 && !doneToday ? { scale: [1, 1.12, 1] } : {}}
        transition={{ duration: 1.6, repeat: Infinity }}
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${doneToday ? 'bg-foreground text-background' : 'bg-foreground/10'}`}
      >
        {doneToday ? <Check size={18} strokeWidth={2.5} /> : <Flame size={18} strokeWidth={2} />}
      </motion.div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight">{title}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {doneToday ? t('streak_done') : t('streak_keep')}
        </p>
      </div>
    </div>
  );
}
