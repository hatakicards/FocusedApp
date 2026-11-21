import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Play, Trash2, Clock, Bell, Lock, CalendarPlus, ChevronRight, Check, Target } from 'lucide-react';
import {
  useFocusSessions,
  useHomeworks,
  useInvalidateAll,
  useOptimisticFocusTimeSave,
  useOptimisticFocusTimeUpdate,
  useOptimisticFocusTimeDelete,
} from '@/lib/useAppData';
import { useI18n, useT } from '@/lib/i18n';
import PullToRefresh from '@/components/PullToRefresh';
import FocusScheduleForm from '@/components/FocusScheduleForm';
import DurationPicker from '@/components/DurationPicker';
import { saveActiveFocus } from '@/lib/activeFocus';
import UsageReportCard from '@/components/UsageReportCard';
import BlockStatusCard from '@/components/BlockStatusCard';
import FocusBlockPicker from '@/components/FocusBlockPicker';
import {
  isScreenTimeSupported,
  getDefaultMode,
  setDefaultMode,
  getSessionMode,
  setSessionMode,
  resolveBlockMode,
  setUsageGoal,
} from '@/lib/nativeScreenTime';
import TutorialDialog from '@/components/TutorialDialog';
import HelpButton from '@/components/HelpButton';
import IphoneToggle from '@/components/IphoneToggle';
import { recurringSchedules, describeDays } from '@/lib/focusSchedule';

// Obiettivo di tempo di utilizzo al giorno (minuti). Vive sul telefono e nell'App Group, dove la
// vista nativa lo usa per il voto della giornata.
const GOAL_KEY = 'focus_usage_goal_min';
const DEFAULT_GOAL = 120;
const GOAL_OPTIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360];

const readGoal = () => {
  try {
    const v = Number(localStorage.getItem(GOAL_KEY));
    return GOAL_OPTIONS.includes(v) ? v : DEFAULT_GOAL;
  } catch {
    return DEFAULT_GOAL;
  }
};

const fmtGoal = (min) => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m}` : `${h} h`;
};

// Focus Time (1.5), stile Opal: in alto l'obiettivo; sotto il tempo di utilizzo di oggi grande in
// titanio con le 3 app piu' usate e il voto (vista nativa di Screen Time); poi "Avvia sessione" e
// "Programma sessione" affiancati; sotto tutte le sessioni programmate.
export default function FocusTime() {
  const { data: sessions } = useFocusSessions();
  const { data: homeworks } = useHomeworks();
  const invalidate = useInvalidateAll();
  const optimisticFocusTimeSave = useOptimisticFocusTimeSave();
  const optimisticFocusTimeUpdate = useOptimisticFocusTimeUpdate();
  const optimisticFocusTimeDelete = useOptimisticFocusTimeDelete();
  const { locale } = useI18n();
  const t = useT();
  const location = useLocation();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [quickPick, setQuickPick] = useState(false);
  const [prefillHomework, setPrefillHomework] = useState(null);
  const [quickMode, setQuickMode] = useState(getDefaultMode);
  const [quickMinutes, setQuickMinutes] = useState(25);
  const [goal, setGoal] = useState(readGoal);
  const [goalOpen, setGoalOpen] = useState(false);
  const prefillHandledRef = useRef(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => { setUsageGoal(goal); }, [goal]);

  useEffect(() => {
    if (prefillHandledRef.current) return;
    const hwId = location.state?.prefillFromHomeworkId;
    if (!hwId) { prefillHandledRef.current = true; return; }
    if (!homeworks) return;
    prefillHandledRef.current = true;
    const hw = homeworks.find((h) => h.id === hwId);
    if (hw) {
      setPrefillHomework(hw);
      setQuickPick(true);
    }
  }, [location.state, homeworks]);

  const now = Date.now();
  const schedules = useMemo(() => recurringSchedules(sessions), [sessions]);
  const upcoming = useMemo(
    () => (sessions || [])
      .filter((s) => !s.is_recurring && s.status === 'scheduled' && new Date(s.scheduled_at).getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [sessions, now]
  );

  const fmtWhen = (iso) =>
    new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const notifiedRef = useRef(new Set());
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return undefined;
    const check = () => {
      const tm = Date.now();
      upcoming.forEach((s) => {
        const dt = new Date(s.scheduled_at).getTime() - tm;
        if (s.reminder_enabled && dt > -60000 && dt < 60000 && !notifiedRef.current.has(s.id)) {
          notifiedRef.current.add(s.id);
          try { new Notification('Focus Time', { body: `${s.title} (${s.duration_minutes} min)` }); } catch { /* ignore */ }
        }
      });
    };
    check();
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [upcoming]);

  // modeOverride: la modalita' scelta adesso (avvio rapido); altrimenti quella salvata
  // per la sessione, o il valore predefinito.
  const handleStart = async (session, modeOverride) => {
    const wanted = modeOverride ?? (session?.id ? getSessionMode(session.id) : getDefaultMode());
    const blockMode = await resolveBlockMode(wanted);
    const durationMin = session?.duration_minutes || 25;
    saveActiveFocus({
      blockMode,
      durationMin,
      endAt: Date.now() + durationMin * 60 * 1000,
      spotifyUrl: session?.spotify_url || null,
      session: session || null,
    });
    window.dispatchEvent(new Event('focus-active-changed'));
    if (session?.spotify_url) {
      try { window.open(session.spotify_url, '_blank'); } catch { /* ignore */ }
    }
  };

  const handleToggleSchedule = async (s, on) => {
    await optimisticFocusTimeUpdate(s.id, { schedule_active: on });
  };

  const handleDelete = async (id) => {
    await optimisticFocusTimeDelete(id);
  };

  const handleSchedule = async (payload) => {
    if (editing?.id) await optimisticFocusTimeUpdate(editing.id, payload);
    else await optimisticFocusTimeSave(null, { ...payload, status: 'scheduled' });
  };

  const handleQuickStart = async (mins) => {
    const title = prefillHomework ? `${prefillHomework.subject} — ${prefillHomework.title}` : t('ft_sessione_rapida');
    const created = await optimisticFocusTimeSave(null, {
      title,
      scheduled_at: new Date().toISOString(),
      duration_minutes: mins,
      status: 'scheduled',
      linked_homework_id: prefillHomework?.id || null,
    });
    setQuickPick(false);
    setPrefillHomework(null);
    if (created?.id) setSessionMode(created.id, quickMode);
    setDefaultMode(quickMode);
    handleStart(created, quickMode);
  };

  // Primo Focus Time guidato (dal primo avvio): parte subito con la durata scelta.
  const autoStartRef = useRef(false);
  useEffect(() => {
    const mins = location.state?.autoStartMinutes;
    if (!mins || autoStartRef.current) return;
    autoStartRef.current = true;
    handleQuickStart(mins);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pickGoal = (min) => {
    setGoal(min);
    try { localStorage.setItem(GOAL_KEY, String(min)); } catch { /* ignore */ }
    setGoalOpen(false);
  };

  const openSchedule = () => { setEditing(null); setFormOpen(true); };
  const group = 'divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card';
  const hasScheduled = schedules.length > 0 || upcoming.length > 0;

  return (
    <>
      <PullToRefresh onRefresh={invalidate}>
        <div className="mx-auto max-w-xl px-5 safe-top pb-4">
          {/* Obiettivo */}
          <header className="mb-5 flex items-center justify-between gap-3">
            <button onClick={() => setGoalOpen(true)} className="flex min-w-0 items-center gap-3 text-left active:opacity-70">
              <span className="titanium-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border">
                <Target size={20} strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('ftn_goal')}</span>
                <span className="flex items-center gap-1 text-xl font-bold tracking-tight">
                  {fmtGoal(goal)} <span className="text-sm font-medium text-muted-foreground">{t('ftn_per_day')}</span>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </span>
              </span>
            </button>
            <HelpButton pageId="focus" />
          </header>

          {/* Blocco in corso: pausa, ripresa, fine */}
          <BlockStatusCard className="mb-5" />

          {/* Tempo di utilizzo, 3 app piu' usate e voto */}
          <UsageReportCard className="mb-5" />

          {/* Avvia / Programma */}
          <div className="mb-8 grid grid-cols-2 gap-3">
            <button
              onClick={() => setQuickPick(true)}
              className="titanium-bg flex h-28 flex-col justify-between rounded-3xl p-4 text-left transition-transform active:scale-[0.98]"
            >
              <Play size={22} />
              <span className="text-base font-bold leading-tight">{t('ftn_start')}</span>
            </button>
            <button
              onClick={openSchedule}
              className="flex h-28 flex-col justify-between rounded-3xl border border-border bg-card p-4 text-left transition-transform active:scale-[0.98]"
            >
              <CalendarPlus size={22} />
              <span className="text-base font-bold leading-tight">{t('ftn_schedule')}</span>
            </button>
          </div>

          {/* Sessioni programmate */}
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ftn_scheduled')}</h2>
          {!hasScheduled ? (
            <button onClick={openSchedule} className="w-full rounded-2xl border border-dashed border-border p-5 text-left text-xs text-muted-foreground">
              {t('ft_prog_vuoto')}
            </button>
          ) : (
            <div className={group}>
              {schedules.map((s) => (
                <div key={s.id} className={`flex items-center justify-between gap-3 px-4 py-3.5 ${s.schedule_active === false ? 'opacity-50' : ''}`}>
                  <button onClick={() => { setEditing(s); setFormOpen(true); }} className="min-w-0 text-left">
                    <span className="block truncate text-sm font-semibold">{s.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock size={11} className="shrink-0" />
                      <span className="truncate">{describeDays(s.repeat_days, locale, { everyDay: t('ft_ogni_giorno'), weekdays: t('ft_feriali') })} · {s.start_time}–{s.end_time}</span>
                      {s.block_mode && s.block_mode !== 'off' && <Lock size={11} className="shrink-0" />}
                    </span>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <IphoneToggle checked={s.schedule_active !== false} onChange={(on) => handleToggleSchedule(s, on)} />
                    <button onClick={() => handleDelete(s.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive" aria-label={t('elimina')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
              {upcoming.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-3.5">
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{s.title}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock size={11} /> {fmtWhen(s.scheduled_at)} · {s.duration_minutes} min
                      {s.reminder_enabled && <Bell size={11} />}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button onClick={() => handleStart(s)} className="rounded-lg bg-foreground p-2 text-background" aria-label={t('ftn_start')}>
                      <Play size={14} />
                    </button>
                    <button onClick={() => handleDelete(s.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive" aria-label={t('elimina')}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <FocusScheduleForm open={formOpen} schedule={editing} onClose={() => { setFormOpen(false); setEditing(null); }} onSaved={handleSchedule} />
        </div>
      </PullToRefresh>

      {quickPick && createPortal(
        <div
          className="fixed inset-0 z-[65] bg-background/80 backdrop-blur-sm flex items-center justify-center px-6"
          onClick={() => { setQuickPick(false); setPrefillHomework(null); }}
        >
          <div className="w-full max-w-sm rounded-3xl bg-card border border-border p-6" onClick={(e) => e.stopPropagation()}>
            {prefillHomework && (
              <div className="mb-4 rounded-xl bg-foreground/5 px-3 py-2.5 text-xs">
                <span className="text-muted-foreground">{t('ft_focus_su')}</span>{' '}
                <span className="font-semibold">{prefillHomework.subject} — {prefillHomework.title}</span>
              </div>
            )}
            {isScreenTimeSupported() && (
              <div className="mb-5 rounded-2xl border border-border p-3">
                <FocusBlockPicker mode={quickMode} onChange={setQuickMode} />
              </div>
            )}
            <h3 className="text-base font-semibold mb-4">{t('ft_quanto')}</h3>
            <DurationPicker value={quickMinutes} onChange={setQuickMinutes} />
            <button
              onClick={() => handleQuickStart(quickMinutes)}
              disabled={quickMinutes < 1}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background transition-transform active:scale-[0.98] disabled:opacity-40"
            >
              <Play size={16} /> {t('ftn_start')}
            </button>
          </div>
        </div>,
        document.body
      )}

      {goalOpen && createPortal(
        <div className="fixed inset-0 z-[65] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center" onClick={() => setGoalOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm rounded-t-3xl border border-border bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-5 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base font-semibold">{t('ftn_goal_title')}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{t('ftn_goal_sub')}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {GOAL_OPTIONS.map((m) => (
                <button
                  key={m}
                  onClick={() => pickGoal(m)}
                  className={`flex items-center justify-center gap-1 rounded-xl border py-3 text-sm font-semibold tabular-nums transition-colors ${goal === m ? 'border-foreground bg-foreground text-background' : 'border-border'}`}
                >
                  {goal === m && <Check size={14} strokeWidth={3} />}{fmtGoal(m)}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      <TutorialDialog pageId="focus" />
    </>
  );
}
