import { useState, useEffect } from 'react';
import { Image } from '@/components/ui/image';
import { LogOut, Clock, Flame, Trophy, Target, Trash2, ChevronRight, Check, Globe, Crown, Lock, Gift, Sparkles, Megaphone, Ban, Lightbulb } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useActivities, useRatings, useGoals, useUserSettings, useTasks, useInvalidateAll, useLessonGrades } from '@/lib/useAppData';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { LOGO_URL, CATEGORIES, RANKS } from '@/lib/constants';
import { computeLongestStreak, computeCategoryRank } from '@/lib/productivity';
import { useI18n, useT, LANGUAGES } from '@/lib/i18n';
import RankBadge from '@/components/RankBadge';
import TimeCapsule from '@/components/TimeCapsule';
import Archive from '@/components/Archive';
import ProfileSelector from '@/components/ProfileSelector';
import PremiumModal from '@/components/PremiumModal';
import TutorialDialog from '@/components/TutorialDialog';
import WelcomeToProAnimation from '@/components/WelcomeToProAnimation';
import { useSubscription } from '@/lib/useAppData';
import { redeemFreeCode } from '@/lib/promoCodes';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

export default function Profilo() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const { data: settings } = useUserSettings();
  const { data: tasks } = useTasks();
  const { data: lessonGrades } = useLessonGrades();
  const invalidate = useInvalidateAll();
  const qc = useQueryClient();
  const { lang, setLang } = useI18n();
  const t = useT();
  const [reminderTime, setReminderTime] = useState(settings?.reminder_time || '21:00');
  const [reminderEnabled, setReminderEnabled] = useState(settings?.reminder_enabled ?? true);
  const [deleting, setDeleting] = useState(false);
  const [showPremium, setShowPremium] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('openPremium') === '1') {
      setShowPremium(true);
    }
  }, []);

  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState(null);
  const [celebrateTier, setCelebrateTier] = useState(null);
  const sub = useSubscription();

  const handleRedeemPromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setPromoStatus('checking');
    if (code === '3MONTHS1EUR0') {
      try {
        setPromoStatus('redirecting');
        const res = await base44.functions.invoke('create-promo-checkout', {
          user_id: user?.id,
          origin: window.location.origin,
        });
        const promoUrl = res?.data?.url || res?.url;
        if (promoUrl) {
          window.location.href = promoUrl;
          return;
        }
        setPromoStatus('error');
      } catch (e) {
        console.error('Promo error:', e);
        setPromoStatus('error');
      }
      return;
    }
    const result = await redeemFreeCode(code, { settings, user, invalidate });
    setPromoStatus(result);
    if (result === 'success') {
      setPromoCode('');
      setCelebrateTier('premium');
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    setCancelResult(null);
    try {
      const res = await base44.functions.invoke('cancel-subscription', {});
      setCancelResult({ success: true, cancel_at: res?.data?.cancel_at || res?.cancel_at });
      invalidate();
    } catch (e) {
      console.error('Cancel error:', e);
      setCancelResult({ success: false, error: e.message || 'Errore' });
    } finally {
      setCancelling(false);
    }
  };

  const highestStreak = (activities || []).reduce((max, a) => {
    const aRatings = (ratings || []).filter((r) => r.activity_id === a.id);
    return Math.max(max, computeLongestStreak(aRatings));
  }, 0);

  const categoryRanks = CATEGORIES.map((cat) =>
    computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || [])
  );
  const highestRankIndex = Math.max(-1, ...categoryRanks.map((r) => r.rankIndex));
  const highestRank = highestRankIndex >= 0 ? RANKS[highestRankIndex] : null;

  const completedGoals = (goals || [])
    .filter((g) => g.completed && g.completed_date)
    .sort((a, b) => (b.completed_date || '').localeCompare(a.completed_date || ''));
  const lastGoal = completedGoals[0];
  const lastGoalActivity = lastGoal ? (activities || []).find((a) => a.id === lastGoal.activity_id) : null;

  const handleSaveReminder = async () => {
    if (!settings) return;
    await getDB().UserSettings.update(settings.id, {
      reminder_time: reminderTime,
      reminder_enabled: reminderEnabled,
    });
    invalidate();
  };

  const handleProfileChange = async (profileType) => {
    if (!settings) return;
    const key = ['userSettings', user?.id];
    const prev = qc.getQueryData(key);
    qc.setQueryData(key, { ...settings, profile_type: profileType });
    try {
      await getDB().UserSettings.update(settings.id, { profile_type: profileType });
    } catch (e) {
      qc.setQueryData(key, prev);
      console.error(e);
    }
    invalidate();
  };

  const handleLogout = () => {
    logout();
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      await getDB().UserSettings.deleteMany({ created_by_id: user.id });
      await getDB().DailyRating.deleteMany({ created_by_id: user.id });
      await getDB().Activity.deleteMany({ created_by_id: user.id });
      await getDB().Goal.deleteMany({ created_by_id: user.id });
      await getDB().DayEntry.deleteMany({ created_by_id: user.id });
      await getDB().GymSession.deleteMany({ created_by_id: user.id });
      await getDB().LifeStat.deleteMany({ created_by_id: user.id });
    } catch (e) {
      console.error('Delete account error:', e);
    }
    logout();
  };

  return (
    <div className="px-5 safe-top pb-4">
      <div className="flex flex-col items-center mb-6">
        <div className="w-20 h-20 mb-3">
          <Image src={LOGO_URL} alt="Focused" fittingType="fit" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">{user?.isGuest ? t('guest_logged') : (user?.full_name || user?.email)}</h1>
        <p className="text-sm text-muted-foreground">{user?.isGuest ? t('guest_data_local') : user?.email}</p>
      </div>

      {/* Work with Us */}
      <button
        onClick={() => navigate('/work-with-us')}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-card py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors mb-3"
      >
        <Megaphone size={12} />
        {t('wwu_btn')}
      </button>

      {/* Invite friends */}
      <button
        onClick={() => navigate('/invita')}
        className="flex w-full items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6 hover:bg-emerald-500/10 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
          <Gift size={18} className="text-emerald-500" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">{t('profilo_invita')}</p>
          <p className="text-xs text-muted-foreground">{t('profilo_invita_sub')}</p>
        </div>
        <ChevronRight size={18} className="text-muted-foreground" />
      </button>

      {/* Dream Functionality */}
      <button
        onClick={() => navigate('/dream')}
        className="flex w-full items-center gap-3 rounded-2xl border border-foreground/20 bg-foreground/5 p-4 mb-6 hover:bg-foreground/10 transition-colors"
      >
        <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
          <Lightbulb size={18} className="text-foreground" />
        </div>
        <div className="text-left flex-1">
          <p className="text-sm font-semibold">{t('dream_btn')}</p>
          <p className="text-xs text-muted-foreground">{t('dream_btn_sub')}</p>
        </div>
        <ChevronRight size={18} className="text-muted-foreground" />
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center text-center">
          <Flame size={18} className="text-foreground mb-1" />
          <span className="text-2xl font-bold">{highestStreak}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">{t('profilo_streak_record')}</span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center text-center">
          {highestRank ? (
            <>
              <RankBadge rankId={highestRank.id} size="sm" showName={false} />
              <span className="text-[10px] text-muted-foreground mt-1">{t('rank_' + highestRank.id)}</span>
            </>
          ) : (
            <>
              <Trophy size={18} className="text-muted-foreground mb-1" />
              <span className="text-[10px] text-muted-foreground mt-0.5">{t('nessun_rank')}</span>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 flex flex-col items-center text-center">
          <Target size={18} className="text-foreground mb-1" />
          <span className="text-2xl font-bold">{completedGoals.length}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">{t('profilo_obiettivi')}</span>
        </div>
      </div>

      {/* Last goal */}
      {lastGoal && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('profilo_ultimo')}</p>
          <p className="text-sm font-medium">{lastGoal.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {lastGoalActivity?.name} · {new Date(lastGoal.completed_date).toLocaleDateString(lang === 'en' ? 'en-US' : lang, { day: 'numeric', month: 'short' })}
          </p>
        </div>
      )}

      {/* Language selector */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Globe size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{t('profilo_lingua')}</span>
        </div>
        <div className="flex items-center gap-2">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              className={`flex-1 rounded-xl overflow-hidden transition-all ${
                lang === l.code ? 'ring-2 ring-foreground' : 'opacity-50'
              }`}
            >
              <img
                src={l.flag}
                alt={l.label}
                className="w-full h-7 object-fill"
              />
            </button>
          ))}
        </div>
      </div>

      {/* Profile switcher */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-semibold">{t('profilo_profilo')}</span>
        </div>
        <ProfileSelector
          value={settings?.profile_type || 'base'}
          onChange={handleProfileChange}
          compact
          lockedProfiles={sub.canUseProfiles ? [] : ['atleta', 'studente', 'professionista']}
          onLockedClick={() => setShowPremium(true)}
        />
      </div>

      {/* Reminder */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{t('profilo_promemoria')}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-foreground text-sm font-medium outline-none [color-scheme:dark]"
          />
          <button
            onClick={() => {
              setReminderEnabled(!reminderEnabled);
            }}
            className={`rounded-xl px-3 py-2.5 text-xs font-medium transition-colors ${
              reminderEnabled ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'
            }`}
          >
            {reminderEnabled ? t('profilo_attivo') : t('profilo_off')}
          </button>
        </div>
        <button
          onClick={handleSaveReminder}
          className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background"
        >
          {t('salva')}
        </button>
      </div>

      {/* Category ranks */}
      <div className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('profilo_rank_cat')}</p>
        <div className="space-y-2">
          {CATEGORIES.map((cat, idx) => {
            const rank = categoryRanks[idx];
            return (
              <div key={cat.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                <span className="text-sm">{t('cat_' + cat.id + '_short')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{rank.rank ? t('rank_' + rank.rank.id) : t('nessun_rank')}</span>
                  <RankBadge rankId={rank.rank?.id} size="sm" showName={false} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Statistiche di vita */}
      <Link to="/statistiche" className="block rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold flex items-center gap-2">
              {t('profilo_stats_vita')}
              {!sub.canUseLifeStats && <Lock size={14} className="text-muted-foreground" />}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">{t('profilo_stats_sub')}</p>
          </div>
          <ChevronRight size={18} className="text-muted-foreground" />
        </div>
      </Link>

      {/* Time capsule */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{t('profilo_capsula')}</span>
        </div>
        <TimeCapsule />
      </div>

      {/* Archivio */}
      <Archive tasks={tasks} ratings={ratings} />

      {/* Promo code redemption */}
      {!sub.promoActive && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Gift size={16} className="text-foreground" />
            <span className="text-sm font-semibold">{t('profilo_codice')}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => { setPromoCode(e.target.value); setPromoStatus(null); }}
              placeholder={t('profilo_codice_placeholder')}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-foreground text-sm font-medium outline-none uppercase"
            />
            <button
              onClick={handleRedeemPromo}
              disabled={!promoCode.trim() || promoStatus === 'checking'}
              className="rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background disabled:opacity-50"
            >
              {promoStatus === 'checking' ? '...' : t('profilo_codice_btn')}
            </button>
          </div>
          {promoStatus === 'success' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-green-500">
              <Sparkles size={12} /> {t('profilo_codice_success')}
            </p>
          )}
          {promoStatus === 'invalid' && (
            <p className="mt-2 text-xs text-destructive">{t('profilo_codice_invalid')}</p>
          )}
          {promoStatus === 'error' && (
            <p className="mt-2 text-xs text-destructive">{t('profilo_codice_error')}</p>
          )}
          {promoStatus === 'redirecting' && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-400">
              <Sparkles size={12} /> {t('profilo_codice_redirecting')}
            </p>
          )}
          {promoStatus === 'already_used' && (
            <p className="mt-2 text-xs text-destructive">{t('profilo_codice_already_used')}</p>
          )}
        </div>
      )}
      {sub.promoActive && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-foreground/30 bg-foreground/5 py-3 text-sm font-medium text-foreground mb-6">
          <Sparkles size={16} /> {t('profilo_promo_active')}
        </div>
      )}

      {/* Switch to premium */}
      {!sub.isPro ? (
        <button
          onClick={() => setShowPremium(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3 text-sm font-semibold text-background mb-6"
        >
          <Crown size={16} /> {t('pm_switch')}
        </button>
      ) : (
        <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground mb-6">
          <Check size={16} /> {sub.isPremium ? 'PREMIUM' : 'PRO'}
        </div>
      )}
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
      <WelcomeToProAnimation tier={celebrateTier} onClose={() => setCelebrateTier(null)} />

      {sub.isPro && settings?.stripe_subscription_id && !cancelResult?.success && (
        <div className="mb-6">
          <button
            onClick={handleCancelSubscription}
            disabled={cancelling}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <Ban size={16} /> {cancelling ? '...' : 'Disdici abbonamento'}
          </button>
          <p className="mt-1.5 text-center text-[11px] text-muted-foreground">
            Disdici prima del rinnovo: mantieni l'accesso fino al termine del periodo pagato.
          </p>
        </div>
      )}
      {cancelResult?.success && (
        <div className="mb-6 rounded-xl border border-foreground/30 bg-foreground/5 p-3 text-center text-sm">
          <p className="font-medium text-foreground">Abbonamento disdetto</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Attivo fino al {new Date(cancelResult.cancel_at).toLocaleDateString('it-IT')}
          </p>
        </div>
      )}
      {cancelResult && !cancelResult.success && (
        <p className="mb-6 text-center text-xs text-destructive">{cancelResult.error}</p>
      )}

      <button
        onClick={handleLogout}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut size={16} /> {t('esci')}
      </button>

      {/* Account deletion */}
      {!user?.isGuest && (
      <div className="mt-6">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors">
              <Trash2 size={16} /> {t('profilo_elimina')}
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('profilo_elimina')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('profilo_elimina_desc')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>{t('annulla')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => { e.preventDefault(); handleDeleteAccount(); }}
                disabled={deleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? t('profilo_elimina_eliminazione') : t('profilo_elimina_def')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      )}
      <TutorialDialog pageId="profilo" />
    </div>
  );
}