import { useCallback, useEffect, useState } from 'react';
import { Footprints, Pencil } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { useT, useI18n } from '@/lib/i18n';
import { getStepsFromHealth, enableSense } from '@/lib/healthSense';

const GOAL_KEY = 'steps_goal';
const DEFAULT_GOAL = 8000;

const readGoal = () => {
  try { return parseInt(localStorage.getItem(GOAL_KEY), 10) || DEFAULT_GOAL; } catch { return DEFAULT_GOAL; }
};

// "Passi giornalieri": letti da Salute (iPhone), con l'obiettivo che scegli tu e gli ultimi
// 7 giorni in barrette. L'obiettivo resta sul telefono.
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
    setDays(await getStepsFromHealth(7));
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
  const pct = Math.min(100, Math.round((today / goal) * 100));
  const max = Math.max(goal, ...(days || []).map((d) => d.steps), 1);
  const hasData = days && days.some((d) => d.steps > 0);

  return (
    <div className={`rounded-2xl border border-border/70 bg-card p-4 ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2">
          <Footprints size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{t('bf_steps_t')}</span>
        </span>
        <span className="text-[11px] text-muted-foreground">{t('bf_steps_d')}</span>
      </div>

      {!native ? (
        <p className="text-xs text-muted-foreground">{t('bf_steps_native')}</p>
      ) : days === null || !hasData ? (
        <div>
          <p className="mb-3 text-xs text-muted-foreground">{t('bf_steps_empty')}</p>
          <button onClick={connect} className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background">{t('bf_steps_connect')}</button>
        </div>
      ) : (
        <>
          <p className="titanium-text text-4xl font-bold tabular-nums leading-none">{today.toLocaleString(locale)}</p>
          <div className="mb-1 mt-3 h-1.5 overflow-hidden rounded-full bg-foreground/10">
            <div className="titanium-bg h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <div className="mb-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{pct}%</span>
            {editing ? (
              <span className="flex items-center gap-1.5">
                {t('bf_steps_goal')}
                <input
                  type="number"
                  inputMode="numeric"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={saveGoal}
                  onKeyDown={(e) => e.key === 'Enter' && saveGoal()}
                  autoFocus
                  className="w-20 rounded-lg border border-border bg-background px-2 py-1 text-xs text-foreground outline-none"
                />
              </span>
            ) : (
              <button onClick={() => { setDraft(String(goal)); setEditing(true); }} className="flex items-center gap-1">
                {t('bf_steps_goal')}: {goal.toLocaleString(locale)} <Pencil size={11} />
              </button>
            )}
          </div>
          <div className="flex h-12 items-end gap-1.5">
            {days.map((d) => (
              <div key={d.date} className="flex flex-1 flex-col items-center justify-end">
                <div
                  className={`w-full rounded-t ${d.steps >= goal ? 'titanium-bg' : 'bg-foreground/25'}`}
                  style={{ height: `${Math.max(4, (d.steps / max) * 100)}%` }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
