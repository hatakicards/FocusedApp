import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Focus, X, Check, ChevronLeft } from 'lucide-react';
import { useT } from '@/lib/i18n';

const DURATIONS = [
  { mins: 15, hintKey: 'ft_hint_short' },
  { mins: 25, hintKey: 'ft_hint_pomodoro' },
  { mins: 50, hintKey: 'ft_hint_deep' },
  { mins: 90, hintKey: 'ft_hint_flow' },
];

const fmt = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function FocusSession() {
  const t = useT();
  const [stage, setStage] = useState('idle');
  const [totalMs, setTotalMs] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  );
  const wakeRef = useRef(null);
  const endAtRef = useRef(0);

  const acquireWake = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* ignore */ }
  };

  const releaseWake = () => {
    try { wakeRef.current?.release?.(); } catch { /* ignore */ }
    wakeRef.current = null;
  };

  const requestPermissionIfNeeded = async () => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
    try {
      const res = await Notification.requestPermission();
      setPermission(res);
    } catch { /* ignore */ }
  };

  const enterPick = async () => {
    await requestPermissionIfNeeded();
    setStage('pick');
  };

  const start = async (mins) => {
    const ms = mins * 60 * 1000;
    setTotalMs(ms);
    setRemaining(ms);
    endAtRef.current = Date.now() + ms;
    setStage('running');
    acquireWake();
  };

  const stop = () => {
    setStage('idle');
    releaseWake();
  };

  const pushedRef = useRef(false);

  useEffect(() => {
    if (stage === 'idle') return;
    const overlayValue = `focus-${stage}`;
    const url = new URL(window.location.href);
    url.searchParams.set('overlay', overlayValue);
    if (pushedRef.current) {
      window.history.replaceState({ overlay: overlayValue }, '', url.toString());
    } else {
      window.history.pushState({ overlay: overlayValue }, '', url.toString());
      pushedRef.current = true;
    }
  }, [stage]);

  useEffect(() => {
    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        stop();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleClose = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
    stop();
  };

  useEffect(() => {
    if (stage !== 'running') return;
    const id = setInterval(() => {
      const rem = endAtRef.current - Date.now();
      if (rem <= 0) {
        clearInterval(id);
        setRemaining(0);
        setStage('done');
        releaseWake();
        try {
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(t('fs_notif_title'), { body: t('fs_notif_body') });
          }
        } catch { /* ignore */ }
      } else {
        setRemaining(rem);
      }
    }, 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible' && stage === 'running') acquireWake();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [stage]);

  if (stage === 'idle') {
    return (
      <button
        onClick={enterPick}
        className="w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
      >
        <Focus size={18} /> Full Focus
      </button>
    );
  }

  if (stage === 'pick') {
    return createPortal(
      <div className="fixed inset-0 z-[70] bg-background flex flex-col">
        <header className="flex items-center justify-between px-5 safe-top pb-2">
          <button onClick={handleClose} className="rounded-lg p-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ChevronLeft size={22} />
          </button>
          <h2 className="text-base font-semibold">Full Focus</h2>
          <button onClick={handleClose} className="rounded-lg p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-foreground/10 flex items-center justify-center mb-6">
            <Focus size={30} className="text-foreground" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-center mb-1">{t('fs_quanto')}</h3>
          <p className="text-sm text-muted-foreground text-center mb-8">{t('fs_resto')}</p>

          <div className="w-full max-w-sm grid grid-cols-2 gap-3">
            {DURATIONS.map((d) => (
              <button
                key={d.mins}
                onClick={() => start(d.mins)}
                className="rounded-2xl border border-border bg-card p-5 text-left active:scale-[0.98] transition-transform"
              >
                <span className="block text-2xl font-bold tabular-nums">{d.mins} min</span>
                <span className="text-xs text-muted-foreground">{t(d.hintKey)}</span>
              </button>
            ))}
          </div>

          {permission === 'denied' && (
            <p className="text-xs text-muted-foreground/70 text-center mt-8 max-w-xs">{t('fs_notif_off')}</p>
          )}
        </div>
      </div>,
      document.body
    );
  }

  if (stage === 'running') {
    const R = 120;
    const C = 2 * Math.PI * R;
    const pct = totalMs > 0 ? remaining / totalMs : 0;
    const offset = C * (1 - pct);
    return createPortal(
      <div className="fixed inset-0 z-[70] bg-background flex flex-col">
        <header className="flex items-center justify-end px-5 safe-top pb-2">
          <button onClick={handleClose} className="rounded-lg p-2 -mr-2 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-10">
            <Focus size={16} />
            <span className="text-xs font-semibold uppercase tracking-wider">Full Focus</span>
          </div>

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
              <span className="text-6xl font-bold tabular-nums">{fmt(remaining)}</span>
              <span className="text-xs text-muted-foreground mt-2">{t('fs_restaf')}</span>
            </div>
          </div>

          <button onClick={handleClose} className="mt-12 rounded-xl border border-border px-6 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground">
            {t('ftimer_termina')}
          </button>
        </div>
      </div>,
      document.body
    );
  }

  // done
  return createPortal(
    <div className="fixed inset-0 z-[70] bg-background flex flex-col items-center justify-center px-6">
      <div className="w-20 h-20 rounded-full bg-foreground/10 flex items-center justify-center mb-6">
        <Check size={40} className="text-foreground" strokeWidth={2.5} />
      </div>
      <h2 className="text-2xl font-bold tracking-tight mb-2 text-center">{t('fs_notif_title')}</h2>
      <p className="text-sm text-muted-foreground text-center mb-10 max-w-xs">
        {t('fs_mantenuto').replace('{n}', String(Math.round(totalMs / 60000)))}
      </p>
      <button onClick={handleClose} className="w-full max-w-xs rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background">
        {t('chiudi')}
      </button>
    </div>,
    document.body
  );
}