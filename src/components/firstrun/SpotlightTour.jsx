import { useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useSubscription } from '@/lib/useAppData';

// Giro dell'app con i punti illuminati: tutto il resto si oscura e resta acceso solo
// il pulsante di cui si parla, con scritto se e' incluso nel piano gratuito o se si
// sblocca con Premium. I punti sono cercati con data-tour="..." nella barra in basso
// (solo telefono): su desktop, dove non ci sono, il giro viene saltato.
const PAD = 7;

export default function SpotlightTour({ onDone }) {
  const t = useT();
  const sub = useSubscription();
  const [list, setList] = useState(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState(null);

  useEffect(() => {
    const defs = [
      { id: 'oggi', locked: false },
      { id: 'agenda', locked: false },
      { id: 'focus', locked: false },
      { id: 'obiettivi', locked: !sub.canUseRankings },
      { id: 'personal', locked: !sub.canUseProfiles },
      { id: 'focusy', locked: false },
    ];
    const found = defs.filter((d) => {
      const el = document.querySelector(`[data-tour="${d.id}"]`);
      const r = el?.getBoundingClientRect();
      return r && r.width > 0 && r.height > 0;
    });
    if (found.length === 0) onDone();
    else setList(found);
  }, []);

  const current = list?.[i];

  useLayoutEffect(() => {
    if (!current) return undefined;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${current.id}"]`);
      setRect(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [current]);

  if (!list || !current || !rect) return null;

  const isLast = i === list.length - 1;
  const next = () => (isLast ? onDone() : setI(i + 1));
  const bottomGap = window.innerHeight - rect.top + PAD + 14;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[90]">
      {/* Blocca i tocchi sull'app sotto: durante il giro si guarda e basta. */}
      <div className="absolute inset-0" />
      <motion.div
        key={current.id}
        className="pointer-events-none absolute rounded-2xl border-2 border-white"
        style={{
          left: rect.left - PAD, top: rect.top - PAD,
          width: rect.width + PAD * 2, height: rect.height + PAD * 2,
          boxShadow: '0 0 0 100vmax rgba(0,0,0,0.88)',
          borderStyle: current.locked ? 'dashed' : 'solid',
        }}
        initial={{ opacity: 0, scale: 1.25 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      />
      <motion.div
        key={`tip-${current.id}`}
        className="absolute inset-x-5 mx-auto max-w-sm rounded-2xl bg-white p-5 text-black shadow-2xl"
        style={{ bottom: bottomGap }}
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
      >
        <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-black/40">{t('fr_tour_t')}</p>
        <h3 className="text-lg font-bold tracking-tight">{current.id === 'focusy' ? t('fr_tour_focusy_t') : t('nav_' + current.id)}</h3>
        <p className="mt-1 text-sm leading-relaxed text-black/70">{t(`fr_tour_${current.id}_d`)}</p>
        <p className="mt-3 flex items-center gap-1.5 text-xs font-semibold">
          {current.locked ? <Lock size={13} /> : <Check size={13} strokeWidth={3} />}
          {current.locked ? t('fr_tour_locked') : t('fr_tour_free')}
        </p>
        <div className="mt-4 flex items-center justify-between">
          <div className="flex gap-1">
            {list.map((_, k) => (
              <span key={k} className={`h-1.5 rounded-full transition-all ${k === i ? 'w-4 bg-black' : 'w-1.5 bg-black/20'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onDone} className="text-xs text-black/40">{t('fr_skip')}</button>
            <button onClick={next} className="rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white">{t('fr_next')}</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
