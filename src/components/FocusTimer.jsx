import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Play, Check, Lock, Minus, ChevronUp, Focus as FocusIcon } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { startBlock, stopBlock, setShieldContent, setKeepAwake } from '@/lib/nativeScreenTime';
import { useUserSettings } from '@/lib/useAppData';
import { scheduleSessionEnd, cancelSessionEnd } from '@/lib/dailyReminder';

const MIN_PERSIST_MS = 60 * 1000;

const fmt = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

// minimized: la sessione resta attiva ma sta in una barretta sopra la barra in basso (e la
// pubblicita'), cosi' nel frattempo si usa il resto di Focused. Il blocco delle app e il timer
// non dipendono da cosa e' a schermo.
export default function FocusTimer({ durationMin, endAt, spotifyUrl, session, blockMode, minimized = false, onMinimize, onExpand, onComplete, onClose }) {
  const t = useT();
  const { data: settings } = useUserSettings();
  const totalMs = durationMin * 60 * 1000;
  // endAt (ms) c'e' quando la sessione viene ripristinata dopo che l'app e' stata in secondo piano.
  const endAtRef = useRef(endAt || Date.now() + totalMs);
  const [remaining, setRemaining] = useState(Math.max(0, endAtRef.current - Date.now()));
  const [done, setDone] = useState(endAtRef.current <= Date.now());
  const wakeRef = useRef(null);
  const [blockFailed, setBlockFailed] = useState(false);
  const [barOffset, setBarOffset] = useState(16);

  // La barretta sta sopra la barra in basso (che contiene anche la pubblicita'): ne segue l'altezza.
  useEffect(() => {
    const nav = document.getElementById('bottom-nav');
    if (!nav) return undefined;
    const measure = () => setBarOffset(nav.offsetHeight > 0 ? nav.offsetHeight + 8 : 16);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(nav);
    return () => ro.disconnect();
  }, []);

  const handleClose = () => {
    onClose?.();
  };

  const handleStop = () => {
    const elapsedMs = totalMs - remaining;
    if (elapsedMs >= MIN_PERSIST_MS) {
      onComplete?.({ actualMinutes: Math.max(1, Math.round(elapsedMs / 60000)), completedFully: false });
    }
    handleClose();
  };

  // Blocco app durante la sessione (solo iOS, solo se l'utente l'ha attivato) e
  // notifica di fine sessione per quando Focused e' in secondo piano.
  useEffect(() => {
    if (!blockMode || blockMode === 'off') return undefined;
    if (endAtRef.current <= Date.now()) return undefined;
    setShieldContent({ dream: settings?.dream, subtitle: t('shield_subtitle'), button: t('shield_button') })
      .then(() => startBlock(new Date(endAtRef.current), blockMode))
      .then((r) => { if (!r.active) setBlockFailed(r.error || true); });
    scheduleSessionEnd(new Date(endAtRef.current), t('ftimer_notif_title'), t('ftimer_notif_body'));
    return () => {
      stopBlock();
      cancelSessionEnd();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Lo schermo non si spegne per tutta la sessione: wake lock del browser e, sull'app iOS,
    // isIdleTimerDisabled (il wake lock della WebView non e' affidabile).
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) wakeRef.current = await navigator.wakeLock.request('screen');
      } catch { /* ignore */ }
      setKeepAwake(true);
    };
    acquire();
    // Al ritorno nell'app: ripiglia lo schermo acceso e aggiorna subito il tempo rimasto.
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      acquire();
      setRemaining(Math.max(0, endAtRef.current - Date.now()));
    };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(() => {
      const rem = endAtRef.current - Date.now();
      if (rem <= 0) {
        clearInterval(id);
        setRemaining(0);
        setDone(true);
        if (blockMode && blockMode !== 'off') stopBlock();
        try { wakeRef.current?.release?.(); } catch { /* ignore */ }
        setKeepAwake(false);
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(t('ftimer_notif_title'), { body: t('ftimer_notif_body') });
          }
        } catch { /* ignore */ }
      } else {
        setRemaining(rem);
      }
    }, 250);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      try { wakeRef.current?.release?.(); } catch { /* ignore */ }
      setKeepAwake(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const R = 120;
  const C = 2 * Math.PI * R;
  const pct = totalMs > 0 ? remaining / totalMs : 0;
  const offset = C * (1 - pct);
  const openSpotify = () => { if (spotifyUrl) window.open(spotifyUrl, '_blank'); };

  if (done) {
    return createPortal(
      <div className="fixed inset-0 z-[70] bg-background flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mb-6">
          <Check size={40} strokeWidth={2.5} />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-center">{t('ftimer_completato')}</h2>
        <p className="text-sm text-muted-foreground mb-10 text-center">
          {durationMin} {t('ftimer_min_focus')}{session?.title ? ` — ${session.title}` : ''}
        </p>
        <button
          onClick={() => { onComplete?.({ actualMinutes: durationMin, completedFully: true }); handleClose(); }}
          className="w-full max-w-xs rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background"
        >
          {t('chiudi')}
        </button>
      </div>,
      document.body
    );
  }

  if (minimized) {
    const locked = blockMode && blockMode !== 'off';
    return createPortal(
      <button
        onClick={onExpand}
        style={{ bottom: barOffset }}
        className="fixed left-3 right-16 z-[45] overflow-hidden rounded-2xl bg-foreground px-4 py-2.5 text-left text-background shadow-xl md:left-auto md:right-4 md:w-72"
      >
        <span className="flex items-center gap-3">
          {locked ? <Lock size={16} className="shrink-0" /> : <FocusIcon size={16} className="shrink-0" />}
          <span className="text-base font-bold tabular-nums">{fmt(remaining)}</span>
          <span className="min-w-0 flex-1 truncate text-xs opacity-70">{session?.title || t('oggi_focus')}</span>
          <ChevronUp size={16} className="shrink-0 opacity-70" />
        </span>
        <span className="absolute inset-x-0 bottom-0 h-0.5 bg-background/20">
          <span className="block h-full bg-background" style={{ width: `${(1 - pct) * 100}%` }} />
        </span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      <header className="flex items-center justify-between px-5 safe-top pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('oggi_focus')}</span>
        <div className="flex items-center gap-4">
          <button onClick={onMinimize} aria-label={t('ftimer_riduci')} className="text-muted-foreground hover:text-foreground">
            <Minus size={22} />
          </button>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="relative">
          <svg width="280" height="280" className="-rotate-90">
            <circle cx="140" cy="140" r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
            <circle
              cx="140" cy="140" r={R} fill="none" stroke="hsl(var(--foreground))" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
              className="transition-[stroke-dashoffset] duration-300 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`font-bold tabular-nums ${remaining >= 3600000 ? 'text-5xl' : 'text-6xl'}`}>{fmt(remaining)}</span>
            {session?.title && <span className="text-xs text-muted-foreground mt-2">{session.title}</span>}
          </div>
        </div>

        {blockMode && blockMode !== 'off' && (
          <div className="mt-8 flex flex-col items-center gap-2 text-muted-foreground">
            <Lock size={56} strokeWidth={1.5} className="text-foreground" />
            <span className="text-xs font-semibold uppercase tracking-wider">{t('ft_blocco_attivo')}</span>
          </div>
        )}

        {spotifyUrl && (
          <button onClick={openSpotify} className="mt-10 flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold">
            <Play size={16} /> {t('ftimer_apri_spotify')}
          </button>
        )}

        {blockFailed && <p className="mt-6 max-w-xs text-center text-xs text-muted-foreground">{t('fb_err')}{typeof blockFailed === 'string' ? ` (${blockFailed})` : ''}</p>}

        <button onClick={handleStop} className="mt-8 text-sm font-semibold text-muted-foreground hover:text-foreground">
          {t('ftimer_termina')}
        </button>
      </div>
    </div>,
    document.body
  );
}