import { useCallback, useEffect, useState } from 'react';
import { Footprints, Pencil } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useT, useI18n } from '@/lib/i18n';
import { getStepsFromHealth, enableSense } from '@/lib/healthSense';

const GOAL_KEY = 'steps_goal';
const DEFAULT_GOAL = 8000;
const RADIUS = 88;
const CIRC = 2 * Math.PI * RADIUS;

const readGoal = () => {
  try { return parseInt(localStorage.getItem(GOAL_KEY), 10) || DEFAULT_GOAL; } catch { return DEFAULT_GOAL; }
};

// In cima a Athlete: i passi di oggi (da Salute) dentro un anello che si riempie verso
// l'obiettivo scelto. L'obiettivo resta sul telefono.
export default function StepsCard({ className = '' }) {
  const t = useT();
  const { locale } = useI18n();
  const [days, setDays] = useState(null); // null = non letto / non disponibile
  const [goal, setGoal] = useState(readGoal);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const native = Capacitor.getPlatform() === 'ios';

  const load = useCallback(async () => {
    if (!native) return;
    setDays(await getStepsFromHealth(1));
  }, [native]);

  useEffect(() => {
    load();
    const onVisible = () => { if (document.visibilityState === 'visible') load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  const connect = async () => { await enableSense(); load(); };

  const saveGoal = () => {
    const n = parseInt(draft, 10);
    if (n > 0) {
      setGoal(n);
      try { localStorage.setItem(GOAL_KEY, String(n)); } catch { /* ignore */ }
    }
    setEditing(false);
  };

  const today = days?.[days.length - 1]?.steps ?? 0;
  const pct = Math.min(1, today / goal);
  const connected = days !== null && days.some((d) => d.steps > 0);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90">
          <defs>
            <linearGradient id="stepsRing" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f2f3f4" />
              <stop offset="55%" stopColor="#a7abb0" />
              <stop offset="100%" stopColor="#e4e6e8" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r={RADIUS} fill="none" stroke="currentColor" strokeWidth="12" className="text-foreground/10" />
          <circle
            cx="100" cy="100" r={RADIUS} fill="none" stroke="url(#stepsRing)" strokeWidth="12" strokeLinecap="round"
            strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - pct)}
            style={{ transition: 'stroke-dashoffset 0.9s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Footprints size={18} strokeWidth={1.6} className="mb-1 text-muted-foreground" />
          <p className="titanium-text text-5xl font-bold tabular-nums leading-none">{today.toLocaleString(locale)}</p>
          <p className="mt-1.5 text-[11px] uppercase tracking-widest text-muted-foreground">{t('bf_steps_t')}</p>
        </div>
      </div>

      {editing ? (
        <span className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {t('bf_steps_goal')}
          <input
            type="number"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={saveGoal}
            onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
            autoFocus
            className="w-24 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm text-foreground outline-none"
          />
        </span>
      ) : (
        <button onClick={() => { setDraft(String(goal)); setEditing(true); }} className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          {t('bf_steps_goal')}: <span className="font-semibold text-foreground/80">{goal.toLocaleString(locale)}</span> <Pencil size={11} />
        </button>
      )}

      {native && !connected && (
        <button onClick={connect} className="titanium-bg mt-3 rounded-xl px-4 py-2 text-xs font-bold">{t('bf_steps_connect')}</button>
      )}
      {!native && <p className="mt-2 text-center text-[11px] text-muted-foreground">{t('bf_steps_native')}</p>}
    </div>
  );
}
