import { useState } from 'react';
import { Moon, Dumbbell, Lock } from 'lucide-react';
import { useUserSettings, useGymSessions, useSubscription } from '@/lib/useAppData';
import { useI18n, useT, weekdayLongById } from '@/lib/i18n';
import TutorialDialog from '@/components/TutorialDialog';
import PremiumModal from '@/components/PremiumModal';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function GymTracker() {
  const { data: settings } = useUserSettings();
  const { data: sessions } = useGymSessions();
  const sub = useSubscription();
  const { locale } = useI18n();
  const t = useT();
  const [showPremium, setShowPremium] = useState(false);

  if (!settings) {
    return (
      <div className="px-5 safe-top pb-4 flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings.gym_enabled) {
    return (
      <div className="px-5 safe-top pb-4 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <Moon size={56} strokeWidth={1.5} className="text-muted-foreground mb-4" />
        <h1 className="text-xl font-bold tracking-tight mb-1">{t('gt_disattivato')}</h1>
        <p className="text-sm text-muted-foreground">{t('gt_attiva')}</p>
      </div>
    );
  }

  const todayId = WEEKDAY_IDS[new Date().getDay()];
  const todayName = weekdayLongById(locale, todayId);
  const session = (sessions || []).find((s) => s.day_of_week === todayId);
  const exercises = session?.exercises || [];

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center gap-2">
        <Dumbbell size={22} />
        <h1 className="text-2xl font-bold tracking-tight">Gym</h1>
      </header>

      {!sub.isPro ? (
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-14 h-14 rounded-full border-2 border-border flex items-center justify-center mb-4 text-muted-foreground">
            <Lock size={26} />
          </div>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">{t('gt_scheda_locked')}</p>
          <button
            onClick={() => setShowPremium(true)}
            className="rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background"
          >
            {t('gate_unlock')}
          </button>
        </div>
      ) : !session ? (
        <div className="flex flex-col items-center justify-center text-center py-16">
          <Moon size={48} strokeWidth={1.5} className="text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">{t('gt_non_oggi')}</p>
          <p className="text-xs text-muted-foreground/60 mt-1">{t('gt_modifica_scheda')}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('gt_scheda_oggi')}</h2>
          <p className="text-sm text-muted-foreground mb-4 capitalize">{todayName}</p>
          <div className="space-y-2">
            {exercises.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-4 text-center">
                <p className="text-sm text-muted-foreground">{t('gt_nessun_es')}</p>
              </div>
            ) : (
              exercises.map((ex, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-sm font-medium">{ex.name}</p>
                  {ex.info && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{ex.info}</p>
                  )}
                </div>
              ))
            )}
          </div>
          {session.title && (
            <p className="text-[10px] text-muted-foreground/60 mt-4 text-center">{session.title}</p>
          )}
        </div>
      )}
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
      <TutorialDialog pageId="gym" />
    </div>
  );
}