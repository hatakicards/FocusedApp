import { useCallback, useEffect, useState } from 'react';
import { Lock, Pause, Play, Square, ChevronDown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  isNativeV2, getBlockState, pauseBlock, resumeBlock, stopBlock, getAuthorizationStatus, onNativeBlockEvent,
} from '@/lib/nativeScreenTime';
import { loadActiveFocus, saveActiveFocus, clearActiveFocus } from '@/lib/activeFocus';
import { registerPlugin } from '@capacitor/core';

const FocusedScreenTime = registerPlugin('FocusedScreenTime');
const PAUSE_OPTIONS = [5, 10, 15, 30, 60];
const clock = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

// Focus Time (1.5.1): il blocco in corso, come lo vede iOS, sempre in cima alla pagina. Da qui si mette
// in pausa, si riprende o si termina, senza dover aprire il timer. Sotto, i dettagli tecnici (modalita',
// liste, autorizzazione) da mandare in uno screenshot se qualcosa non torna.
export default function BlockStatusCard({ className = '' }) {
  const t = useT();
  const [v2, setV2] = useState(false);
  const [state, setState] = useState(null);
  const [details, setDetails] = useState(null);
  const [open, setOpen] = useState(false);
  const [pauseMenu, setPauseMenu] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!(await isNativeV2())) return;
    setV2(true);
    setState(await getBlockState());
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus-active-changed', refresh);
    const off1 = onNativeBlockEvent('blockEnded', refresh);
    const off2 = onNativeBlockEvent('blockResumed', refresh);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus-active-changed', refresh);
      off1(); off2();
    };
  }, [refresh]);

  const loadDetails = async () => {
    const [auth, block, keep] = await Promise.all([
      getAuthorizationStatus(),
      FocusedScreenTime.getSelectionSummary({ kind: 'block' }).catch(() => null),
      FocusedScreenTime.getSelectionSummary({ kind: 'keep' }).catch(() => null),
    ]);
    setDetails({ auth, block, keep, mode: localStorage.getItem('focus_block_mode_v2') || '-' });
  };

  const syncLocal = (patch) => {
    const cur = loadActiveFocus();
    if (cur) saveActiveFocus({ ...cur, ...patch });
    window.dispatchEvent(new Event('focus-active-changed'));
    window.dispatchEvent(new Event('focus-native-sync'));
  };

  const doPause = async (m) => {
    setBusy(true);
    setPauseMenu(false);
    const r = await pauseBlock(m);
    if (r?.pausedUntil) syncLocal({ pausedUntil: new Date(r.pausedUntil).getTime() });
    await refresh();
    setBusy(false);
  };

  const doResume = async () => {
    setBusy(true);
    await resumeBlock();
    syncLocal({ pausedUntil: null });
    await refresh();
    setBusy(false);
  };

  const doStop = async () => {
    setBusy(true);
    await stopBlock({ dismissSchedule: true });
    clearActiveFocus();
    window.dispatchEvent(new Event('focus-active-changed'));
    await refresh();
    setBusy(false);
  };

  if (!v2 || !state?.active) return null;

  const remainingMs = new Date(state.endAt).getTime() - Date.now();
  const modeLabel = state.mode === 'all_except' ? t('fb_mode_all') : t('fb_mode_selected');

  return (
    <div className={`rounded-3xl border border-border bg-card p-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
          {state.paused ? <Pause size={18} /> : <Lock size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold">
            {state.paused ? `${t('ftp_paused_until')} ${clock(state.pausedUntil)}` : t('bsc_active')}
          </span>
          <span className="block truncate text-xs text-muted-foreground">
            {modeLabel} · {t('bsc_until')} {clock(state.endAt)}
          </span>
        </span>
      </div>

      {pauseMenu ? (
        <div className="mt-3">
          <p className="mb-2 text-xs text-muted-foreground">{t('ftp_how_long')}</p>
          <div className="grid grid-cols-5 gap-1.5">
            {PAUSE_OPTIONS.filter((m) => m * 60000 < remainingMs - 30000).map((m) => (
              <button key={m} disabled={busy} onClick={() => doPause(m)} className="rounded-xl border border-border py-2.5 text-sm font-semibold tabular-nums active:scale-95">
                {m < 60 ? `${m}m` : '1h'}
              </button>
            ))}
          </div>
          <button onClick={() => setPauseMenu(false)} className="mt-2 w-full py-1 text-xs text-muted-foreground">{t('annulla')}</button>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {state.paused ? (
            <button disabled={busy} onClick={doResume} className="titanium-bg flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold active:scale-[0.98]">
              <Play size={15} /> {t('ftp_resume_now')}
            </button>
          ) : (
            <button disabled={busy || remainingMs < 6 * 60000} onClick={() => setPauseMenu(true)} className="titanium-bg flex items-center justify-center gap-1.5 rounded-2xl py-3 text-sm font-bold active:scale-[0.98] disabled:opacity-40">
              <Pause size={15} /> {t('ftp_take_break')}
            </button>
          )}
          <button disabled={busy} onClick={doStop} className="flex items-center justify-center gap-1.5 rounded-2xl border border-border py-3 text-sm font-semibold active:scale-[0.98]">
            <Square size={13} /> {t('bsc_stop')}
          </button>
        </div>
      )}

      <button
        onClick={() => { const n = !open; setOpen(n); if (n) loadDetails(); }}
        className="mt-3 flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
      >
        {t('bsc_details')} <ChevronDown size={12} className={open ? 'rotate-180' : ''} />
      </button>
      {open && (
        <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-foreground/[0.05] p-3 text-[10px] leading-relaxed text-muted-foreground">
{`source: ${state.source}${state.scheduleId ? ` (${state.scheduleId.slice(0, 8)})` : ''}
mode: ${state.mode}
shieldApplied: ${state.shieldApplied}
endAt: ${state.endAt}
paused: ${state.paused}${state.pausedUntil ? ` until ${state.pausedUntil}` : ''}
auth: ${details?.auth ?? '...'}
block list: ${details?.block ? `${details.block.apps} app, ${details.block.categories} cat${details.block.overLimit ? ', OLTRE 50' : ''}` : '...'}
keep list: ${details?.keep ? `${details.keep.apps} app, ${details.keep.categories} cat` : '...'}
default mode: ${details?.mode ?? '...'}`}
        </pre>
      )}
    </div>
  );
}
