import { Moon, Dumbbell, AlertCircle, CheckCircle, TrendingDown, TrendingUp } from 'lucide-react';
import { useUserSettings, useGymSessions, useBodyFuelEntries } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { calculateAge } from '@/lib/ageCheck';
import { computeCumulativeSleepDebt, isGymDay } from '@/lib/sleepData';
import { todayISO } from '@/lib/productivity';

export default function SleepDebtTracker() {
  const t = useT();
  const { data: settings } = useUserSettings();
  const { data: gymSessions } = useGymSessions();
  const { data: entries } = useBodyFuelEntries();

  const today = todayISO();
  const todayEntry = (entries || []).find((e) => e.date === today);
  const age = calculateAge(settings?.birth_date);
  const gymDay = isGymDay(gymSessions);
  const todayActual = todayEntry ? (todayEntry.sleep_hours || 0) + (todayEntry.sleep_minutes || 0) / 60 : 0;

  const debt = computeCumulativeSleepDebt(age, entries || [], gymSessions);

  if (!debt) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Moon size={16} className="text-purple-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('bf_sleep_debt_title')}</p>
        </div>
        <p className="text-xs text-muted-foreground">{t('bf_sleep_debt_no_age')}</p>
      </div>
    );
  }

  if (debt.daysCounted === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Moon size={16} className="text-purple-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('bf_sleep_debt_title')}</p>
        </div>
        <p className="text-sm">
          {t('bf_sleep_debt_age_msg').replace('{hours}', debt.recommended.toFixed(1))}
        </p>
        <p className="text-xs text-muted-foreground mt-2">{t('bf_sleep_debt_no_data')}</p>
      </div>
    );
  }

  const isNegative = debt.totalDebt > 0;

  return (
    <div className={`rounded-2xl border p-4 mb-4 ${debt.isRested ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
      <div className="flex items-center gap-2 mb-3">
        <Moon size={16} className="text-purple-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('bf_sleep_debt_title')}</p>
      </div>

      {/* Main message */}
      <div className="space-y-2">
        <p className="text-sm">
          {t('bf_sleep_debt_age_msg').replace('{hours}', debt.recommended.toFixed(1))}
        </p>
        {gymDay && (
          <p className="text-xs text-muted-foreground flex items-start gap-1.5">
            <Dumbbell size={14} className="text-blue-400 shrink-0 mt-0.5" />
            {t('bf_sleep_debt_gym_extra')}
          </p>
        )}
      </div>

      {/* Big total debt number */}
      <div className="flex items-center justify-center gap-3 mt-4 mb-3">
        <div className={`flex h-16 w-16 items-center justify-center rounded-2xl ${debt.isRested ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
          {debt.isRested ? <CheckCircle size={32} className="text-emerald-500" /> : <AlertCircle size={32} className="text-amber-500" />}
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('bf_sleep_debt_total_debt')}</p>
          <p className={`text-3xl font-bold tabular-nums ${debt.isRested ? 'text-emerald-500' : 'text-amber-500'}`}>
            {isNegative ? '-' : '+'}{Math.abs(debt.totalDebt).toFixed(1)}h
          </p>
          <p className="text-[11px] text-muted-foreground">
            {t('bf_sleep_debt_over').replace('{n}', debt.daysCounted)} · {t('bf_sleep_debt_avg').replace('{n}', debt.avgDebt > 0 ? `-${debt.avgDebt.toFixed(1)}` : `+${Math.abs(debt.avgDebt).toFixed(1)}`)}h/giorno
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-background/50 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('bf_sleep_debt_recommended')}</p>
          <p className="text-base font-bold tabular-nums text-purple-400">{debt.totalRecommended.toFixed(0)}h</p>
        </div>
        <div className="rounded-xl bg-background/50 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('bf_sleep_debt_actual')}</p>
          <p className="text-base font-bold tabular-nums">{debt.totalActual.toFixed(0)}h</p>
        </div>
        <div className="rounded-xl bg-background/50 p-2.5 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('bf_sleep_debt_debt')}</p>
          <p className={`text-base font-bold tabular-nums ${debt.isRested ? 'text-emerald-500' : 'text-amber-500'}`}>
            {isNegative ? '-' : '+'}{Math.abs(debt.totalDebt).toFixed(1)}h
          </p>
        </div>
      </div>

      {/* Today's sleep */}
      {todayActual > 0 && (
        <div className="flex items-center gap-2 mt-3 rounded-xl bg-background/50 p-2.5">
          <Moon size={14} className="text-purple-400 shrink-0" />
          <p className="text-xs text-muted-foreground">
            {t('bf_sleep_debt_today')}: <span className="text-foreground font-semibold">{todayActual.toFixed(1)}h</span>
          </p>
        </div>
      )}

      {/* Status message */}
      <div className={`flex items-center gap-2 mt-3 rounded-xl p-2.5 ${debt.isRested ? 'bg-emerald-500/15' : 'bg-amber-500/15'}`}>
        {debt.isRested ? <TrendingUp size={16} className="text-emerald-500 shrink-0" /> : <TrendingDown size={16} className="text-amber-500 shrink-0" />}
        <p className="text-xs">
          {debt.isRested
            ? t('bf_sleep_debt_well_rest')
            : t('bf_sleep_debt_owes').replace('{n}', Math.abs(debt.totalDebt).toFixed(1))}
        </p>
      </div>
    </div>
  );
}