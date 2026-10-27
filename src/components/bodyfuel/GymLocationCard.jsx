import { useEffect, useState } from 'react';
import { MapPin, Check } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  isGymLocationSupported, getGymPlace, saveGymPlaceHere, clearGymPlace, syncGymVisits,
} from '@/lib/gymLocation';

// "Posizione palestra": si salva dove ti alleni una volta sola; poi Focused riconosce da solo
// quando arrivi e quando esci (smart tracking) e ti chiede com'e' andato l'allenamento.
export default function GymLocationCard({ className = '' }) {
  const t = useT();
  const [place, setPlace] = useState(() => getGymPlace());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => { syncGymVisits(); }, []);

  const save = async () => {
    setBusy(true);
    setMsg('');
    const r = await saveGymPlaceHere({
      gym_notif_enter_title: t('gym_notif_enter_title'),
      gym_notif_enter_body: t('gym_notif_enter_body'),
      gym_notif_exit_title: t('gym_notif_exit_title'),
      gym_notif_exit_body: t('gym_notif_exit_body'),
    });
    setBusy(false);
    if (r.ok) {
      setPlace(getGymPlace());
      if (!r.always) setMsg(t('bf_gymloc_when_in_use'));
    } else if (r.reason === 'denied') setMsg(t('bf_gymloc_denied'));
    else if (r.reason === 'unsupported') setMsg(t('bf_gymloc_native'));
    else setMsg(t('bf_gymloc_error'));
  };

  const remove = async () => {
    await clearGymPlace();
    setPlace(null);
    setMsg('');
  };

  return (
    <div className={`rounded-2xl border border-border/70 bg-card p-4 ${className}`}>
      <div className="mb-1 flex items-center gap-2">
        <MapPin size={16} className="text-muted-foreground" />
        <p className="text-sm font-semibold">{t('bf_gymloc_t')}</p>
      </div>
      {place ? (
        <>
          <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Check size={13} /> {t('bf_gymloc_saved')}. {t('bf_gymloc_saved_d')}
          </p>
          <button onClick={remove} className="rounded-xl border border-border/70 px-3 py-2 text-xs font-semibold">{t('bf_gymloc_remove')}</button>
        </>
      ) : (
        <>
          <p className="mb-3 text-xs leading-snug text-muted-foreground">{t('bf_gymloc_d')}</p>
          <button
            onClick={save}
            disabled={busy || !isGymLocationSupported()}
            className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40"
          >
            {t('bf_gymloc_set')}
          </button>
          {!isGymLocationSupported() && <p className="mt-2 text-[11px] text-muted-foreground">{t('bf_gymloc_native')}</p>}
        </>
      )}
      {msg && <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{msg}</p>}
    </div>
  );
}
