import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Plus, Play, Trash2, Focus, Check, Clock, Bell, Sparkles } from 'lucide-react';
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
import FocusTimer from '@/components/FocusTimer';
import FocusScheduleForm from '@/components/FocusScheduleForm';
import DurationPicker from '@/components/DurationPicker';
import { saveActiveFocus, loadActiveFocus, clearActiveFocus } from '@/lib/activeFocus';
import FocusStats from '@/components/FocusStats';
import FocusyAssistant from '@/components/FocusyAssistant';
import GymStartCard from '@/components/gym/GymStartCard';
import FocusBlockCard from '@/components/FocusBlockCard';
import FocusBlockPicker from '@/components/FocusBlockPicker';
import {
  isScreenTimeSupported,
  getDefaultMode,
  setDefaultMode,
  getSessionMode,
  setSessionMode,
  resolveBlockMode,
} from '@/lib/nativeScreenTime';
import TutorialDialog from '@/components/TutorialDialog';

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
  const [quickPick, setQuickPick] = useState(false);
  const [timer, setTimer] = useState(null);
  const [prefillHomework, setPrefillHomework] = useState(null);
  const [askFocusy, setAskFocusy] = useState(false);
  const [quickMode, setQuickMode] = useState(getDefaultMode);
  const [quickMinutes, setQuickMinutes] = useState(25);
  const prefillHandledRef = useRef(false);

  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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
  const upcoming = useMemo(
    () => (sessions || [])
      .filter((s) => s.status === 'scheduled' && new Date(s.scheduled_at).getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [sessions, now]
  );
  const past = useMemo(
    () => (sessions || [])
      .filter((s) => s.status !== 'scheduled')
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)),
    [sessions]
  );

  const fmtWhen = (iso) =>
    new Date(iso).toLocaleString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const notifiedRef = useRef(new Set());
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
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
    const active = {
      blockMode,
      durationMin,
      endAt: Date.now() + durationMin * 60 * 1000,
      spotifyUrl: session?.spotify_url || null,
      session: session || null,
    };
    saveActiveFocus(active);
    setTimer(active);
    if (session?.spotify_url) {
      try { window.open(session.spotify_url, '_blank'); } catch { /* ignore */ }
    }
  };

  // Sessione ancora in corso (o finita mentre eri in un'altra app): si riprende da dove era.
  useEffect(() => {
    const active = loadActiveFocus();
    if (active) setTimer(active);
  }, []);

  const handleComplete = async (result) => {
    if (!timer?.session?.id || !result?.actualMinutes) return;
    await optimisticFocusTimeUpdate(timer.session.id, {
      status: 'done',
      completed_at: new Date().toISOString().split('T')[0],
      actual_minutes: result.actualMinutes,
    });
  };

  const handleDelete = async (id) => {
    await optimisticFocusTimeDelete(id);
  };

  const handleSchedule = async (payload, blockMode) => {
    const created = await optimisticFocusTimeSave(null, { ...payload, status: 'scheduled' });
    if (created?.id && blockMode) setSessionMode(created.id, blockMode);
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

  return (
    <>
      <PullToRefresh onRefresh={invalidate}>
        <div className="px-5 safe-top pb-4">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">{t('oggi_focus')}</h1>
            <button
              onClick={() => setFormOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background"
            >
              <Plus size={16} /> {t('ft_programma')}
            </button>
          </header>

          <FocusStats sessions={sessions} />

          <button
            onClick={() => setQuickPick(true)}
            className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between mb-3 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <Focus size={18} />
              <span className="text-sm font-semibold">{t('ft_avvia')}</span>
            </div>
            <Play size={18} className="text-muted-foreground" />
          </button>

          <GymStartCard className="mb-3" />

          <FocusBlockCard className="mb-3" />

          <button
            onClick={() => setAskFocusy(true)}
            className="w-full rounded-2xl border border-border bg-card p-4 flex items-center justify-between mb-6 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <Sparkles size={18} />
              <span className="text-sm font-semibold">{t('ft_chiedi_focusy')}</span>
            </div>
          </button>

          {upcoming.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ft_prossime')}</h2>
              <div className="space-y-2">
                {upcoming.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{s.title}</span>
                      <div className="flex gap-1 shrink-0">
                        <button onClick={() => handleStart(s)} className="rounded-lg p-2 bg-foreground text-background">
                          <Play size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock size={11} /> {fmtWhen(s.scheduled_at)}</span>
                      <span>· {s.duration_minutes} min</span>
                      {s.reminder_enabled && <span className="flex items-center gap-1"><Bell size={11} /> {t('ft_promemoria')}</span>}
                      {s.spotify_url && <span>· Spotify</span>}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ft_cronologia')}</h2>
              <div className="space-y-2">
                {past.map((s) => (
                  <div key={s.id} className="rounded-2xl border border-border bg-card p-4 flex items-center gap-3">
                    <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${s.status === 'done' ? 'bg-foreground text-background' : 'bg-foreground/10'}`}>
                      {s.status === 'done' ? <Check size={14} /> : <Clock size={14} className="text-muted-foreground" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium truncate block">{s.title}</span>
                      <span className="text-[10px] text-muted-foreground">{fmtWhen(s.scheduled_at)} · {s.actual_minutes ?? s.duration_minutes} min</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {upcoming.length === 0 && past.length === 0 && (
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <p className="text-sm text-muted-foreground mb-4">{t('ft_nessuna')}</p>
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
              >
                <Plus size={16} /> {t('ft_programma')}
              </button>
            </div>
          )}

          <FocusScheduleForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSchedule} />
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
              <Play size={16} /> {t('ft_avvia')}
            </button>
          </div>
        </div>,
        document.body
      )}

      {timer && (
        <FocusTimer
          durationMin={timer.durationMin}
          endAt={timer.endAt}
          spotifyUrl={timer.spotifyUrl}
          session={timer.session}
          blockMode={timer.blockMode}
          onComplete={handleComplete}
          onClose={() => { clearActiveFocus(); setTimer(null); }}
        />
      )}

      {askFocusy && (
        <FocusyAssistant defaultOpen initialPrompt={t('ft_focusy_prompt')} />
      )}

      <TutorialDialog pageId="focus" />
    </>
  );
}