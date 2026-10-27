import { useEffect, useState } from 'react';
import { MapPin, ChevronRight, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { openAppSettings } from '@/lib/permissions';
import {
  isGymLocationSupported, getGymPlace, pickGymPlace, clearGymPlace, syncGymVisits,
} from '@/lib/gymLocation';

// "Posizione palestra", in piccolo: tocchi, si apre la mappa (Apple Maps), scegli dov'e' la palestra
// e da quel momento Focused riconosce da solo quando arrivi e quando esci (smart tracking).
export default function GymLocationCard({ className = '' }) {
  const t = useT();
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
      {
        gym_notif_enter_title: t('gym_notif_enter_title'),
        gym_notif_enter_body: t('gym_notif_enter_body'),
        gym_notif_exit_title: t('gym_notif_exit_title'),
        gym_notif_exit_body: t('gym_notif_exit_body'),
      },
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
    else setMsg(t('bf_gymloc_error'));
  };

  const remove = async () => {
    await clearGymPlace();
    setPlace(null);
    setMsg('');
  };

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
