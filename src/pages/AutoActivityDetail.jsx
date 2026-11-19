import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight, Lock } from 'lucide-react';
import PremiumModal from '@/components/PremiumModal';
import { useBodyFuelEntries, useUserSettings, useSubscription } from '@/lib/useAppData';
import { useI18n, useT } from '@/lib/i18n';
import { computeLongestStreak, todayISO } from '@/lib/productivity';
import { useAutoActivities, AUTO_ACTIVITIES } from '@/lib/autoActivities';
import { RATING_COLORS } from '@/lib/constants';
import ActivityIcon from '@/components/ActivityIcon';
import StreakBadge from '@/components/StreakBadge';
import PieChartRating from '@/components/PieChartRating';
import BarChartRating from '@/components/BarChartRating';

// Dettaglio di "Eating well" e "Sleeping well": come le altre abitudini mostra serie, record, voto di oggi,
// distribuzione e andamento, ma i dati arrivano da Body Fuel (cibo e sonno) e non si votano a mano.
export default function AutoActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const t = useT();
  const { locale } = useI18n();
  const sub = useSubscription();
  const { data: entries } = useBodyFuelEntries();
  const { data: settings } = useUserSettings();
  const today = todayISO();
  const auto = useAutoActivities(sub.canUseProfiles, today);
  const activity = auto.find((a) => a.id === `auto-${id}`);
  const eating = id === 'eating';
  const goal = settings?.daily_calories_goal || 0;

  const todayEntry = (entries || []).find((e) => e.date === today);
  const longest = useMemo(() => (activity ? computeLongestStreak(activity.ratings) : 0), [activity]);
  const recent = useMemo(() => [...(activity?.ratings || [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 14), [activity]);
  const entryOf = (date) => (entries || []).find((e) => e.date === date);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const lockedDef = !sub.canUseProfiles ? AUTO_ACTIVITIES.find((a) => a.id === `auto-${id}`) : null;

  if (lockedDef) {
    return (
      <div className="px-5 safe-top">
        <button onClick={() => navigate(-1)} className="mb-6 -ml-1 text-muted-foreground"><ArrowLeft size={20} /></button>
        <div className="flex flex-col items-center pt-10 text-center">
          <span className="titanium-tile mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border">
            <Lock size={26} strokeWidth={1.7} />
          </span>
          <h1 className="text-xl font-bold">{t(lockedDef.nameKey)}</h1>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">{t('fl_auto_locked')}</p>
          <button onClick={() => setPremiumOpen(true)} className="titanium-bg mt-6 w-full max-w-xs rounded-2xl py-4 text-base font-bold active:scale-[0.98]">
            {t('fl_unlock_premium')}
          </button>
        </div>
        <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="px-5 safe-top">
        <button onClick={() => navigate(-1)} className="mb-4 -ml-1 text-muted-foreground"><ArrowLeft size={20} /></button>
        <p className="text-sm text-muted-foreground">{t('detail_non_trovata')}</p>
      </div>
    );
  }

  const sleepText = (e) => `${e?.sleep_hours || 0}h ${e?.sleep_minutes || 0}m`;
  const dataText = (e) => (eating
    ? `${e?.calories_consumed || 0} ${t('bf_kcal')}`
    : sleepText(e));
  const dayLabel = (date) => new Date(`${date}T12:00:00`).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className="px-5 safe-top pb-4">
      <button onClick={() => navigate(-1)} className="mb-4 -ml-1 text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft size={20} />
      </button>

      <header className="mb-6 flex items-center gap-3">
        <ActivityIcon name={activity.icon} size={34} className="shrink-0 text-foreground" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{t(activity.nameKey)}</h1>
          <div className="mt-1 flex items-center gap-2">
            <StreakBadge streak={activity.streak} size="sm" />
            {longest > activity.streak && (
              <>
                <span className="text-muted-foreground/30">·</span>
                <span className="text-xs text-muted-foreground">{t('detail_record')}: {longest}</span>
              </>
            )}
          </div>
        </div>
      </header>

      <section className="mb-6 rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('auto_today')}</p>
          {activity.todayRating != null && (
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold text-white" style={{ backgroundColor: RATING_COLORS[activity.todayRating] }}>
              {activity.todayRating}/5
            </span>
          )}
        </div>
        {activity.todayRating == null ? (
          <p className="text-sm text-muted-foreground">{t('auto_no_data')}</p>
        ) : eating ? (
          <div className="space-y-1">
            <p className="text-3xl font-bold tabular-nums">{todayEntry?.calories_consumed || 0} <span className="text-base font-medium text-muted-foreground">{t('bf_kcal')}</span></p>
            {(todayEntry?.calories_goal || goal) > 0 && (
              <p className="text-xs text-muted-foreground">{t('auto_goal')}: {todayEntry?.calories_goal || goal} {t('bf_kcal')}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('auto_slept')}</p>
            <p className="text-3xl font-bold tabular-nums">{sleepText(todayEntry)}</p>
            {todayEntry?.sleep_bedtime && todayEntry?.sleep_wake_time && (
              <p className="text-xs text-muted-foreground">{todayEntry.sleep_bedtime} → {todayEntry.sleep_wake_time}</p>
            )}
          </div>
        )}
        <button
          onClick={() => navigate('/body-fuel')}
          className="mt-4 flex w-full items-center justify-between rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background"
        >
          {t('auto_log_btn')}
          <ChevronRight size={16} />
        </button>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t('auto_how')}</p>
      </section>

      {activity.ratings.length > 0 && (
        <>
          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('auto_last_days')}</h2>
            <div className="divide-y divide-border rounded-2xl border border-border bg-card">
              {recent.map((r) => (
                <div key={r.date} className="flex items-center justify-between px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{dayLabel(r.date)}</p>
                    <p className="text-xs text-muted-foreground">{dataText(entryOf(r.date))}</p>
                  </div>
                  <span className="flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-xs font-bold text-white" style={{ backgroundColor: RATING_COLORS[r.rating] }}>{r.rating}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail_distribuzione')}</h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <PieChartRating ratings={activity.ratings} />
            </div>
          </section>

          <section className="mb-8">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('detail_andamento')}</h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <BarChartRating ratings={activity.ratings} category="health" />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
