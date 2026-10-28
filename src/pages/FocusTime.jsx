import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { Plus, Play, Trash2, Check, Clock, Bell, Repeat, Lock, ChevronDown } from 'lucide-react';
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
import FocusStats from '@/components/FocusStats';
import UsageReportCard from '@/components/UsageReportCard';
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
import HelpButton from '@/components/HelpButton';
import IphoneToggle from '@/components/IphoneToggle';
import { recurringSchedules, describeDays } from '@/lib/focusSchedule';

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
  const [showAllPast, setShowAllPast] = useState(false);
  const [tab, setTab] = useState(null);
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
  const schedules = useMemo(() => recurringSchedules(sessions), [sessions]);
  const upcoming = useMemo(
    () => (sessions || [])
      .filter((s) => !s.is_recurring && s.status === 'scheduled' && new Date(s.scheduled_at).getTime() >= now - 60 * 60 * 1000)
      .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at)),
    [sessions, now]
  );
  const past = useMemo(
    () => (sessions || [])
      .filter((s) => !s.is_recurring && s.status !== 'scheduled')
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
    window.dispatchEvent(new Event('focus-active-changed'));
    if (session?.spotify_url) {
      try { window.open(session.spotify_url, '_blank'); } catch { /* ignore */ }
    }
  };

  // Ripete una sessione passata con la stessa durata, titolo e blocco.
  const handleRepeat = async (s) => {
    const mins = s.duration_minutes || 25;
    const created = await optimisticFocusTimeSave(null, {
      title: s.title,
      scheduled_at: new Date().toISOString(),
      duration_minutes: mins,
      status: 'scheduled',
      linked_homework_id: s.linked_homework_id || null,
    });
    const mode = created?.id ? getSessionMode(s.id) : getDefaultMode();
    if (created?.id) setSessionMode(created.id, mode);
    handleStart(created, mode);
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
  }, []);

  const group = 'divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card';
  const pastShown = showAllPast ? past : past.slice(0, 3);
  const tabs = [
    ['programs', t('ft_programmi'), schedules.length],
    ['upcoming', t('ft_prossime'), upcoming.length],
    ['history', t('ft_cronologia'), past.length],
  ];
  const activeTab = tab ?? (schedules.length ? 'programs' : upcoming.length ? 'upcoming' : past.length ? 'history' : 'programs');

  return (
    <>
      <PullToRefresh onRefresh={invalidate}>
        <div className="mx-auto max-w-xl px-5 safe-top pb-4">
          <header className="mb-6 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight">{t('nav_focus')}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t('opt_sub')}</p>
            </div>
            <HelpButton pageId="focus" className="mt-1" />
          </header>

          <UsageReportCard className="mb-6" />

          {/* Un'unica azione principale */}
          <button
            onClick={() => setQuickPick(true)}
            className="titanium-bg mb-2 flex w-full flex-col items-center justify-center gap-0.5 rounded-3xl py-5 transition-transform active:scale-[0.98]"
          >
            <span className="flex items-center gap-2 text-lg font-bold"><Play size={20} /> {t('ft_avvia')}</span>
            <span className="text-xs font-medium opacity-60">{t('opt_start_sub')}</span>
          </button>
          <button
            onClick={() => { setEditing(null); setFormOpen(true); }}
            className="mb-7 flex w-full items-center justify-center gap-1.5 py-2 text-sm font-semibold text-muted-foreground"
          >
            <Plus size={15} /> {t('opt_program_session')}
          </button>

          <FocusStats sessions={sessions} className="mb-7" />

          <FocusBlockCard className="mb-7" />

          {/* Una lista alla volta: programmi, prossime o cronologia */}
          <div className="mb-3 flex gap-1 rounded-full bg-foreground/[0.06] p-1">
            {tabs.map(([id, text, count]) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold transition-colors ${activeTab === id ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
              >
                {text}
                {count > 0 && <span className={`text-[10px] tabular-nums ${activeTab === id ? 'opacity-60' : 'opacity-70'}`}>{count}</span>}
              </button>
            ))}
          </div>

          {activeTab === 'programs' && (
            schedules.length === 0 ? (
              <button
                onClick={() => { setEditing(null); setFormOpen(true); }}
                className="w-full rounded-2xl border border-dashed border-border p-5 text-left text-xs text-muted-foreground"
              >
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
                      <button onClick={() => handleDelete(s.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'upcoming' && (
            upcoming.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">{t('ft_nessuna')}</p>
            ) : (
              <div className={group}>
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
                      <button onClick={() => handleStart(s)} className="rounded-lg bg-foreground p-2 text-background">
                        <Play size={14} />
                      </button>
                      <button onClick={() => handleDelete(s.id)} className="rounded-lg p-2 text-muted-foreground hover:text-destructive">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'history' && (
            past.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-5 text-center text-xs text-muted-foreground">{t('ft_nessuna')}</p>
            ) : (
              <div className={group}>
                {pastShown.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 px-4 py-3.5">
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${s.status === 'done' ? 'bg-foreground text-background' : 'bg-foreground/10'}`}>
                      {s.status === 'done' ? <Check size={14} /> : <Clock size={14} className="text-muted-foreground" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{s.title}</span>
                      <span className="text-[11px] text-muted-foreground">{fmtWhen(s.scheduled_at)} · {s.actual_minutes ?? s.duration_minutes} min</span>
                    </div>
                    <button
                      onClick={() => handleRepeat(s)}
                      className="flex shrink-0 items-center gap-1 rounded-lg border border-border/70 px-2.5 py-1.5 text-[11px] font-semibold"
                    >
                      <Repeat size={12} /> {t('ft_ripeti')}
                    </button>
                  </div>
                ))}
                {past.length > 3 && (
                  <button onClick={() => setShowAllPast((v) => !v)} className="flex w-full items-center justify-center gap-1.5 py-3 text-xs font-semibold text-muted-foreground">
                    {showAllPast ? '' : `+${past.length - 3}`} <ChevronDown size={14} className={showAllPast ? 'rotate-180' : ''} />
                  </button>
                )}
              </div>
            )
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
              <Play size={16} /> {t('ft_avvia')}
            </button>
          </div>
        </div>,
        document.body
      )}

      <TutorialDialog pageId="focus" />
    </>
  );
}