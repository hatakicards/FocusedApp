import { useState, useEffect, useRef } from 'react';
import { X, Play, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';

const MIN_PERSIST_MS = 60 * 1000;

const fmt = (ms) => {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export default function FocusTimer({ durationMin, spotifyUrl, session, onComplete, onClose }) {
  const t = useT();
  const totalMs = durationMin * 60 * 1000;
  const [remaining, setRemaining] = useState(totalMs);
  const [done, setDone] = useState(false);
  const endAtRef = useRef(Date.now() + totalMs);
  const wakeRef = useRef(null);
  const pushedRef = useRef(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set('overlay', 'focus-running');
    window.history.pushState({ overlay: 'focus-running' }, '', url.toString());
    pushedRef.current = true;

    const onPopState = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onClose?.();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      if (pushedRef.current) {
        pushedRef.current = false;
        window.history.back();
      }
    };
  }, []);

  const handleClose = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
    }
    onClose?.();
  };

  const handleStop = () => {
    const elapsedMs = totalMs - remaining;
    if (elapsedMs >= MIN_PERSIST_MS) {
      onComplete?.({ actualMinutes: Math.max(1, Math.round(elapsedMs / 60000)), completedFully: false });
    }
    handleClose();
  };

  useEffect(() => {
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) wakeRef.current = await navigator.wakeLock.request('screen');
      } catch { /* ignore */ }
    };
    acquire();
    const id = setInterval(() => {
      const rem = endAtRef.current - Date.now();
      if (rem <= 0) {
        clearInterval(id);
        setRemaining(0);
        setDone(true);
        try { wakeRef.current?.release?.(); } catch { /* ignore */ }
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
      try { wakeRef.current?.release?.(); } catch { /* ignore */ }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const R = 120;
  const C = 2 * Math.PI * R;
  const pct = totalMs > 0 ? remaining / totalMs : 0;
  const offset = C * (1 - pct);
  const openSpotify = () => { if (spotifyUrl) window.open(spotifyUrl, '_blank'); };

  if (done) {
    return (
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
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[70] bg-background flex flex-col">
      <header className="flex items-center justify-between px-5 safe-top pb-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('oggi_focus')}</span>
        <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
          <X size={20} />
        </button>
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
            <span className="text-6xl font-bold tabular-nums">{fmt(remaining)}</span>
            {session?.title && <span className="text-xs text-muted-foreground mt-2">{session.title}</span>}
          </div>
        </div>

        {spotifyUrl && (
          <button onClick={openSpotify} className="mt-10 flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold">
            <Play size={16} /> {t('ftimer_apri_spotify')}
          </button>
        )}

        <button onClick={handleStop} className="mt-8 text-sm font-semibold text-muted-foreground hover:text-foreground">
          {t('ftimer_termina')}
        </button>
      </div>
    </div>
  );
}