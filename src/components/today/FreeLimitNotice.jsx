import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, Layers } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useOptimisticSettingsUpdate, useUserSettings } from '@/lib/useAppData';
import { FREE_ACTIVITY_LIMIT, pickActiveIds, useActivityLimit } from '@/lib/activityLimit';
import ActivityIcon from '@/components/ActivityIcon';
import PremiumModal from '@/components/PremiumModal';

const titaniumBtn = 'titanium-bg flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold active:scale-[0.98] transition-transform disabled:opacity-40';

// 1.5: chi e' nel piano gratuito e ha gia' piu' di 4 attivita' vede una volta questo avviso
// e sceglie quali 4 restano attive. Le altre restano con il lucchetto, senza perdere i dati.
// Chiudere senza scegliere tiene le 4 create per prime.
export default function FreeLimitNotice() {
  const t = useT();
  const limit = useActivityLimit();
  const { data: settings } = useUserSettings();
  const saveSettings = useOptimisticSettingsUpdate();
  const [selected, setSelected] = useState(null);
  const [premiumOpen, setPremiumOpen] = useState(false);
  const [done, setDone] = useState(false);

  const show = !done && !!settings?.id && limit.limited && !limit.chosen && limit.count > FREE_ACTIVITY_LIMIT;

  useEffect(() => {
    if (show && selected === null) setSelected([...pickActiveIds(limit.list, null)]);
  }, [show, selected, limit.list]);

  const toggle = (id) => {
    setSelected((cur) => {
      if (cur.includes(id)) return cur.filter((x) => x !== id);
      if (cur.length >= FREE_ACTIVITY_LIMIT) return cur;
      return [...cur, id];
    });
  };

  const save = (ids) => {
    setDone(true);
    saveSettings(settings.id, { free_activity_ids: ids }).catch(console.error);
  };

  const chosenCount = selected?.length || 0;

  // Portale su body: dentro Today un antenato con transform farebbe scorrere il "fixed" con la pagina.
  return createPortal(
    <>
      <AnimatePresence>
        {show && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
            role="dialog"
            aria-modal="true"
            aria-labelledby="free-limit-title"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-white/10 bg-black px-6 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] pt-7 text-white sm:rounded-3xl"
            >
              <div className="titanium-glow pointer-events-none absolute inset-x-0 top-0 h-40" />
              <span className="titanium-tile relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10">
                <Layers size={26} strokeWidth={1.6} />
              </span>
              <h2 id="free-limit-title" className="relative text-2xl font-bold leading-tight tracking-tight">{t('fl_title')}</h2>
              <p className="relative mt-2 text-sm leading-relaxed text-white/60">{t('fl_desc').replace('{n}', String(FREE_ACTIVITY_LIMIT))}</p>
              <p className="relative mt-5 text-[11px] font-semibold uppercase tracking-widest text-white/45">
                {t('fl_pick').replace('{n}', String(chosenCount)).replace('{max}', String(FREE_ACTIVITY_LIMIT))}
              </p>

              <div className="relative mt-3 space-y-2">
                {limit.list.map((a) => {
                  const on = selected.includes(a.id);
                  const full = !on && chosenCount >= FREE_ACTIVITY_LIMIT;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.id)}
                      disabled={full}
                      aria-pressed={on}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors active:scale-[0.99] ${on ? 'border-white/40 bg-white/10' : 'border-white/10'} ${full ? 'opacity-40' : ''}`}
                    >
                      <ActivityIcon name={a.emoji} size={20} className="text-white" />
                      <span className="flex-1 truncate text-[15px] font-medium">{a.name}</span>
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${on ? 'border-white bg-white text-black' : 'border-white/30'}`}>
                        {on && <Check size={14} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button onClick={() => save(selected)} disabled={chosenCount === 0} className={`${titaniumBtn} mt-6`}>
                {t('fl_save')}
              </button>
              <button onClick={() => setPremiumOpen(true)} className="mt-3 w-full py-2 text-sm font-medium text-white/60">
                {t('fl_premium')}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
    </>,
    document.body,
  );
}
