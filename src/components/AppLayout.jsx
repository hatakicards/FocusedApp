import { useRef, useState, useEffect } from 'react';
import { useOutlet, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { differenceInCalendarDays } from 'date-fns';
import { Sparkles } from 'lucide-react';
import BottomNav from './BottomNav';
import FocusyAssistant from './FocusyAssistant';
import Sidebar from './Sidebar';
import OnboardingReminder from './OnboardingReminder';
import PromotionModal from './PromotionModal';
import StatsSetupModal from './stats/StatsSetupModal';
import WeeklyReviewModal from './stats/WeeklyReviewModal';
import MilestoneChecker from './MilestoneChecker';
import FullScreenAd from './FullScreenAd';
import PromoExpiredModal from './PromoExpiredModal';
import { useUserSettings, usePromotionCheck, useLifeStats, useSubscription, useSyncInit, useOptimisticSettingsUpdate } from '@/lib/useAppData';
import MorningCheckIn from './MorningCheckIn';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { PROFILE_GRADIENTS } from '@/lib/constants';

export default function AppLayout() {
  const { data: settings, isLoading, isError, refetch } = useUserSettings();
  const sub = useSubscription();
  const { promotion, dismissPromotion } = usePromotionCheck();
  const { data: lifeStats, isLoading: statsLoading } = useLifeStats();
  const [statsFlow, setStatsFlow] = useState(null);
  const [promoExpired, setPromoExpired] = useState(false);
  const [focusyOpen, setFocusyOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const outlet = useOutlet();
  const statsDismissed = useRef(false);
  const referralProcessed = useRef(false);
  const { user } = useAuth();
  const optimisticSettingsUpdate = useOptimisticSettingsUpdate();
  useSyncInit();

  // Track unique app usage — 1 event per person per session
  useEffect(() => {
    if (user && !user.isGuest) {
      base44.analytics.track({ eventName: 'app_session_start' });
    }
  }, [user]);

  // Prompt one-time upsell right after a promo trial (e.g. NEWICEPROMO!) expires.
  useEffect(() => {
    const promoUntil = settings?.promo_until;
    if (!promoUntil) return;
    if (new Date(promoUntil).getTime() >= Date.now()) return;
    const ackKey = 'promo_expired_ack_' + promoUntil;
    if (localStorage.getItem(ackKey)) return;
    localStorage.setItem(ackKey, '1');
    setPromoExpired(true);
  }, [settings?.promo_until]);

  // Process referral code from localStorage after auth
  useEffect(() => {
    if (!settings || !user || user.isGuest || referralProcessed.current) return;
    const refCode = localStorage.getItem('focused_ref_code');
    if (!refCode) return;
    referralProcessed.current = true;
    base44.functions.invoke('process-referral', {
      referral_code: refCode,
      invitee_id: user.id,
      invitee_email: user.email,
    })
      .then(() => localStorage.removeItem('focused_ref_code'))
      .catch((e) => console.error('Referral processing error:', e));
  }, [settings, user]);

  useEffect(() => {
    if (statsLoading || !settings?.onboarded) return;
    if (!sub.canUseLifeStats) {
      statsDismissed.current = false;
      return;
    }
    if (statsDismissed.current) return;
    if (!lifeStats || lifeStats.length === 0) {
      setStatsFlow('baseline');
      return;
    }
    const sorted = [...lifeStats].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    const latest = sorted[sorted.length - 1];
    const days = differenceInCalendarDays(new Date(), new Date(latest.date + 'T00:00:00'));
    if (days >= 7) setStatsFlow('review');
  }, [statsLoading, lifeStats, settings?.onboarded, sub?.canUseLifeStats]);

  const statsBaseline =
    lifeStats && lifeStats.length
      ? lifeStats.find((s) => s.is_baseline) ||
        [...lifeStats].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''))[0]
      : null;
  const outletMap = useRef({});
  outletMap.current[location.pathname] = outlet;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-6">
        <p className="text-sm text-muted-foreground text-center">Errore caricamento dati.</p>
        <button
          onClick={() => refetch()}
          className="rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
        >
          Riprova
        </button>
      </div>
    );
  }

  if (!settings || !settings.onboarded) {
    return <OnboardingReminder />;
  }

  return (
    <div className="min-h-screen bg-background md:pl-64">
      <Sidebar />
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: PROFILE_GRADIENTS[settings?.profile_type || 'base'] }}
      />
      <main className="relative z-10 mx-auto max-w-lg md:max-w-4xl min-h-screen overflow-x-hidden pb-36 md:pb-10 md:px-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          {outletMap.current[location.pathname]}
        </motion.div>
      </main>
      <BottomNav />
      <button
        onClick={() => setFocusyOpen(true)}
        aria-label="Focusy"
        className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black shadow-lg active:scale-95 transition-transform md:hidden"
      >
        <Sparkles size={18} />
      </button>
      <FocusyAssistant hideTrigger open={focusyOpen} onOpenChange={setFocusyOpen} />
      <PromotionModal promotion={promotion} onDismiss={dismissPromotion} />
      {statsFlow === 'baseline' && (
        <StatsSetupModal onClose={() => { statsDismissed.current = true; setStatsFlow(null); }} />
      )}
      {statsFlow === 'review' && (
        <WeeklyReviewModal baseline={statsBaseline} onClose={() => { statsDismissed.current = true; setStatsFlow(null); }} />
      )}
      <MilestoneChecker />
      <MorningCheckIn />
      <FullScreenAd enabled={!sub.adsRemoved} onCTA={() => navigate('/work-with-us')} />
      <PromoExpiredModal open={promoExpired} onClose={() => setPromoExpired(false)} />
    </div>
  );
}