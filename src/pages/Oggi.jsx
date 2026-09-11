import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ListChecks, CalendarClock, Gift, Lightbulb, Megaphone, Settings, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  useDayEntries,
  useUserSettings,
  useSubscription,
  useInvalidateAll,
  useOptimisticDayEntry,
} from '@/lib/useAppData';
import { getDB } from '@/lib/guestDB';
import { todayISO } from '@/lib/productivity';
import { useT } from '@/lib/i18n';
import RatingPicker from '@/components/RatingPicker';
import ProfileSelector from '@/components/ProfileSelector';
import PremiumModal from '@/components/PremiumModal';
import FocusyAssistant from '@/components/FocusyAssistant';
import PullToRefresh from '@/components/PullToRefresh';
import TutorialDialog from '@/components/TutorialDialog';

export default function Oggi() {
  const isMobile = useIsMobile();
  const t = useT();
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const { data: dayEntries } = useDayEntries();
  const { data: settings } = useUserSettings();
  const sub = useSubscription();
  const optimisticDayEntry = useOptimisticDayEntry();

  const [showPremium, setShowPremium] = useState(false);
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const today = todayISO();
  const todayEntry = (dayEntries || []).find((e) => e.date === today);
  const profileType = settings?.profile_type || 'base';
  const questionKey = `oggi_q_${profileType}`;

  useEffect(() => {
    if (todayEntry) setRating(todayEntry.day_rating || 0);
  }, [todayEntry]);

  const handleSave = async () => {
    if (rating === 0) return;
    setSaving(true);
    try {
      await optimisticDayEntry(todayEntry, today, rating, '');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleProfileChange = async (profileType) => {
    if (!settings) return;
    try {
      await getDB().UserSettings.update(settings.id, { profile_type: profileType });
      invalidate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PullToRefresh onRefresh={invalidate}>
    <div className="px-5 pb-8 flex flex-col min-h-screen">
      {/* === Hero: statua + com'è andata la giornata === */}
      <div className="relative mb-4" style={isMobile ? { width: '100vw', marginLeft: '-20px' } : {}}>
        <div className={`relative w-full ${isMobile ? 'aspect-[3/4]' : 'aspect-[16/9] rounded-3xl overflow-hidden'} pointer-events-none select-none overflow-hidden`}>
          <img
            src="/images/nuovastatua.png"
            alt=""
            draggable={false}
            className="w-full h-full object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 flex flex-col px-4 pt-10 pb-4">
          <h1 className="text-xl font-bold tracking-tight text-center text-white leading-tight px-2">
            {t(questionKey)}
          </h1>

          <div className="flex-1" />

          <div className="flex flex-col items-center gap-3 mb-3">
            <RatingPicker value={rating} onChange={(v) => { setRating(v); setSaved(false); }} />
            <button
              onClick={handleSave}
              disabled={rating === 0 || saving}
              className="w-full rounded-2xl bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
            >
              {saved ? (
                <>
                  <Check size={16} /> {t('oggi_salvato')}
                </>
              ) : saving ? (
                t('oggi_salvataggio')
              ) : (
                t('oggi_salva')
              )}
            </button>
          </div>

          {/* === Azioni rapide, ai piedi della statua === */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => navigate('/abitudini')}
              className="rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 py-4 px-2 flex flex-col items-center gap-2 text-center text-white hover:bg-black/60 transition-colors"
            >
              <ListChecks size={20} />
              <span className="text-xs font-semibold">{t('home_valuta_abitudini')}</span>
            </button>
            <button
              onClick={() => navigate('/agenda')}
              className="rounded-2xl bg-black/50 backdrop-blur-md border border-white/10 py-4 px-2 flex flex-col items-center gap-2 text-center text-white hover:bg-black/60 transition-colors"
            >
              <CalendarClock size={20} />
              <span className="text-xs font-semibold">{t('home_organizza_giornata')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* === Chat con Focusy: sale a coprire la base della statua, niente taglio netto === */}
      {isMobile ? (
        <div className="relative z-10 -mt-10 mb-6" style={{ width: '100vw', marginLeft: '-20px' }}>
          <div className="rounded-t-3xl border border-border bg-card overflow-hidden h-[380px]">
            <FocusyAssistant inline />
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden h-[420px]">
          <FocusyAssistant inline />
        </div>
      )}

      {/* === Selezione profilo === */}
      <div className="mb-4">
        <ProfileSelector
          value={settings?.profile_type || 'base'}
          onChange={handleProfileChange}
          compact
          lockedProfiles={sub.canUseProfiles ? [] : ['atleta', 'studente', 'professionista']}
          onLockedClick={() => setShowPremium(true)}
        />
      </div>
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />

      {/* === Invita amici / Dream / Work with us === */}
      <div className="grid grid-cols-3 gap-2.5 mb-3">
        <button
          onClick={() => navigate('/invita')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-center hover:bg-emerald-500/10 transition-colors"
        >
          <Gift size={18} className="text-emerald-500" />
          <span className="text-[11px] font-semibold leading-tight">{t('profilo_invita')}</span>
        </button>
        <button
          onClick={() => navigate('/dream')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-foreground/20 bg-foreground/5 p-3 text-center hover:bg-foreground/10 transition-colors"
        >
          <Lightbulb size={18} className="text-foreground" />
          <span className="text-[11px] font-semibold leading-tight">{t('dream_btn')}</span>
        </button>
        <button
          onClick={() => navigate('/work-with-us')}
          className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-3 text-center hover:bg-accent/30 transition-colors"
        >
          <Megaphone size={18} className="text-foreground" />
          <span className="text-[11px] font-semibold leading-tight">{t('wwu_btn')}</span>
        </button>
      </div>

      {/* === Impostazioni profilo === */}
      <button
        onClick={() => navigate('/profilo')}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 mb-6 hover:bg-accent/30 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
          <Settings size={16} className="text-foreground" />
        </div>
        <span className="flex-1 text-left text-sm font-semibold">{t('home_impostazioni_profilo')}</span>
        <ChevronRight size={18} className="text-muted-foreground" />
      </button>
    </div>
    <TutorialDialog pageId="oggi" />
    </PullToRefresh>
  );
}
