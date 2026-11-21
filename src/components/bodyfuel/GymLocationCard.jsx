import { useEffect, useState } from 'react';
import { MapPin, ChevronRight, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { openAppSettings } from '@/lib/permissions';
import {
  isGymLocationSupported, getGymPlace, pickGymPlace, clearGymPlace, syncGymVisits, gymNotifStrings,
} from '@/lib/gymLocation';

// "Posizione palestra", in piccolo: tocchi, si apre la mappa (Apple Maps), scegli dov'e' la palestra
// e da quel momento Focused riconosce da solo quando arrivi e quando esci (smart tracking).
export default function GymLocationCard({ className = '', compact = false }) {
  const { t, lang } = useI18n();
  const [place, setPlace] = useState(() => getGymPlace());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [denied, setDenied] = useState(false);

  useEffect(() => { syncGymVisits(); }, []);

  const choose = async () => {
    if (busy) return;
    setBusy(true);
    setMsg('');
    setDenied(false);
    const r = await pickGymPlace(
      gymNotifStrings(t, lang),
      { title: t('bf_gymloc_t'), hint: t('gym_map_hint'), search: t('gym_map_search'), confirm: t('gym_map_confirm') },
    );
    setBusy(false);
    if (r.ok) {
      setPlace(getGymPlace());
      if (!r.always) setMsg(t('bf_gymloc_when_in_use'));
    } else if (r.reason === 'cancelled') {
      // nessun messaggio: l'utente ha chiuso la mappa
    } else if (r.reason === 'denied') { setMsg(t('bf_gymloc_denied')); setDenied(true); }
    else if (r.reason === 'unsupported') setMsg(t('bf_gymloc_native'));
    else setMsg(`${t('bf_gymloc_error')} (${String(r.reason).slice(0, 80)})`);
  };

  const remove = async () => {
    await clearGymPlace();
    setPlace(null);
    setMsg('');
  };

  // Quadratino accanto ad "Avvia sessione" (Athlete > Gym, 1.5). I messaggi compaiono sotto la riga.
  if (compact) {
    return (
      <div className={`relative w-24 shrink-0 ${className}`}>
        <button
          onClick={choose}
          disabled={busy || !isGymLocationSupported()}
          aria-label={t('bf_gymloc_t')}
          className="flex h-full min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-2xl border border-border bg-card px-1 text-center disabled:opacity-60 active:scale-[0.98] transition-transform"
        >
          {place ? <Check size={20} strokeWidth={2} /> : <MapPin size={20} strokeWidth={1.7} />}
          <span className="text-[10px] font-semibold leading-tight">{t('bf_gymloc_t')}</span>
          {place && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); remove(); }}
              className="text-[9px] text-muted-foreground underline underline-offset-2"
            >
              {t('bf_gymloc_remove')}
            </span>
          )}
        </button>
        {msg && (
          <p className="absolute right-0 top-full z-10 mt-1.5 w-56 rounded-xl border border-border bg-card p-2 text-[11px] leading-snug text-muted-foreground shadow-lg">
            {msg}{' '}
            {denied && <button onClick={openAppSettings} className="font-semibold underline underline-offset-2">{t('wl_perm_settings')}</button>}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={choose}
        disabled={busy || !isGymLocationSupported()}
        className="flex w-full items-center gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3 text-left disabled:opacity-60"
      >
        <MapPin size={18} strokeWidth={1.7} className="shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{t('bf_gymloc_t')}</span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {place ? <><Check size={12} /> {t('bf_gymloc_saved')}</> : t('gym_map_cta')}
          </span>
        </span>
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" />
      </button>
      {place && (
        <button onClick={remove} className="mt-1.5 px-1 text-[11px] font-medium text-muted-foreground underline underline-offset-2">{t('bf_gymloc_remove')}</button>
      )}
      {!isGymLocationSupported() && <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">{t('bf_gymloc_native')}</p>}
      {msg && (
        <p className="mt-1.5 px-1 text-[11px] leading-snug text-muted-foreground">
          {msg}{' '}
          {denied && <button onClick={openAppSettings} className="font-semibold underline underline-offset-2">{t('wl_perm_settings')}</button>}
        </p>
      )}
    </div>
  );
}
