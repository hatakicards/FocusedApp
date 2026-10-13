import { useState } from 'react';
import { Dumbbell, Play, Lock } from 'lucide-react';
import { useUserSettings, useGymSessions, useSubscription } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import PremiumModal from '@/components/PremiumModal';
import GymSessionRunner from '@/components/gym/GymSessionRunner';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Pulsante "Avvia sessione palestra": funzione Pro, come la scheda stessa.
export default function GymStartCard({ className = '' }) {
  const t = useT();
  const { data: settings } = useUserSettings();
  const { data: sessions } = useGymSessions();
  const sub = useSubscription();
  const [running, setRunning] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  // Basta l'interruttore OPPURE una scheda con esercizi: se le impostazioni risultano
  // duplicate/non aggiornate, la scheda salvata deve comunque far comparire il pulsante.
  const hasAnySession = (sessions || []).some((s) => (s?.exercises || []).some((e) => e?.name?.trim()));
  if (!settings?.gym_enabled && !hasAnySession) return null;

  const todayId = WEEKDAY_IDS[new Date().getDay()];
  const session = (sessions || []).find((s) => s.day_of_week === todayId);
  const hasExercises = (session?.exercises || []).some((e) => e?.name?.trim());

  const handleClick = () => {
    if (!sub.isPro) setShowPremium(true);
    else if (hasExercises) setRunning(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        disabled={sub.isPro && !hasExercises}
        className={`w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between active:scale-[0.98] transition-transform disabled:opacity-60 ${className}`}
      >
        <div className="flex items-center gap-3 text-left">
          <Dumbbell size={18} />
          <div>
            <span className="block text-sm font-semibold">{t('gsr_avvia')}</span>
            <span className="block text-xs text-muted-foreground">
              {sub.isPro && !hasExercises ? t('gsr_nessuna_scheda') : t('gsr_avvia_sub')}
            </span>
          </div>
        </div>
        {sub.isPro ? <Play size={18} className="text-muted-foreground" /> : <Lock size={18} className="text-muted-foreground" />}
      </button>

      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
      {running && session && <GymSessionRunner session={session} onClose={() => setRunning(false)} />}
    </>
  );
}
