import { useEffect, useLayoutEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useT } from '@/lib/i18n';

// Apertura del benvenuto: un lucchetto al centro si apre, poi scende verso il basso e si "posa" sulle
// schede appena sbloccate (LifeGame, e con Premium anche Personal), che si illuminano. Su desktop, dove
// la barra in basso non c'e', il lucchetto scende e sparisce.
const LOCK_W = 120;
const LOCK_H = 164;

function Lock({ open }) {
  return (
    <svg viewBox="0 -24 120 164" width={LOCK_W} height={LOCK_H} fill="none" stroke="white" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      {/* L'archetto sta dietro al corpo: la gamba sinistra e' lunga e resta dentro anche da aperto,
          la destra e' corta ed esce quando si alza. */}
      <motion.path
        d="M34 98 V42 a26 26 0 0 1 52 0 V66"
        initial={false}
        animate={open ? { y: -20 } : { y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
      />
      <rect x="16" y="60" width="88" height="72" rx="18" fill="#141414" />
      <circle cx="60" cy="90" r="8" />
      <path d="M60 98 V110" />
    </svg>
  );
}

export default function UnlockIntro({ tier, targets, onContinue }) {
  const t = useT();
  const [phase, setPhase] = useState(0); // 0 compare, 1 si apre, 2 titolo, 3 scende, 4 pronto
  const [rects, setRects] = useState([]);

  useEffect(() => {
    const ids = [setTimeout(() => setPhase(1), 1000), setTimeout(() => setPhase(2), 1600), setTimeout(() => setPhase(3), 3000), setTimeout(() => setPhase(4), 4300)];
    return () => ids.forEach(clearTimeout);
  }, []);

  useLayoutEffect(() => {
    const found = targets
      .map((id) => document.querySelector(`[data-tour="${id}"]`)?.getBoundingClientRect())
      .filter((r) => r && r.width > 0 && r.height > 0);
    setRects(found);
  }, [targets, phase >= 3]);

  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.4;
  const flights = rects.length ? rects : [{ left: cx - 10, top: window.innerHeight * 0.85, width: 20, height: 20 }];
  const flying = phase >= 3;

  return (
    <div className="pointer-events-auto fixed inset-0 z-[90]" onClick={() => phase >= 4 && onContinue()}>
      {/* Fondo: nero pieno all'inizio, poi si alza un po' e lascia intravedere la barra con le schede sbloccate. */}
      <svg className="absolute inset-0 h-full w-full">
        <defs>
          <mask id="unlock-holes">
            <rect width="100%" height="100%" fill="white" />
            {flying && rects.map((r, i) => (
              <rect key={i} x={r.left - 6} y={r.top - 4} width={r.width + 12} height={r.height + 8} rx="14" fill="black" />
            ))}
          </mask>
        </defs>
        <motion.rect
          width="100%" height="100%" fill="black" mask="url(#unlock-holes)"
          initial={{ opacity: 0 }} animate={{ opacity: flying ? 0.86 : 0.96 }} transition={{ duration: 0.6 }}
        />
      </svg>

      {/* Onde di luce quando si apre. */}
      {phase >= 1 && !flying && [0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute h-40 w-40 rounded-full border border-white/30"
          style={{ left: cx - 80, top: cy - 80 }}
          initial={{ scale: 0.6, opacity: 0.8 }}
          animate={{ scale: 3.4, opacity: 0 }}
          transition={{ duration: 1.6, delay: i * 0.25, ease: 'easeOut' }}
        />
      ))}

      {flights.map((r, i) => {
        const tx = r.left + r.width / 2 - cx;
        const ty = r.top + r.height / 2 - cy;
        return (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: cx - LOCK_W / 2, top: cy - LOCK_H / 2, width: LOCK_W, height: LOCK_H }}
            initial={{ scale: 0.5, opacity: 0, y: 30 }}
            animate={flying
              ? { x: tx, y: ty, scale: 0.16, opacity: [1, 1, 0] }
              : { scale: phase === 0 ? [0.5, 1.06, 1] : 1, opacity: 1, y: 0, rotate: phase === 0 ? [0, 0, -6, 6, -3, 0] : 0 }}
            transition={flying
              ? { duration: 1.1, ease: [0.55, 0, 0.75, 0.2], opacity: { duration: 1.1, times: [0, 0.8, 1] } }
              : { duration: 0.9, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 -z-10 rounded-full bg-white/10 blur-2xl" />
            <Lock open={phase >= 1} />
          </motion.div>
        );
      })}

      {/* Le schede sbloccate si accendono quando il lucchetto ci arriva sopra. */}
      {flying && rects.map((r, i) => (
        <motion.span
          key={`ring-${i}`}
          className="pointer-events-none absolute rounded-2xl border-2 border-white"
          style={{ left: r.left - 6, top: r.top - 4, width: r.width + 12, height: r.height + 8 }}
          initial={{ opacity: 0, scale: 1.6 }}
          animate={{ opacity: 1, scale: [1.6, 1, 1.08, 1], boxShadow: '0 0 24px rgba(255,255,255,0.45)' }}
          transition={{ delay: 0.9, duration: 0.7 }}
        />
      ))}

      <div className="pointer-events-none absolute inset-x-0 flex flex-col items-center px-8 text-center text-white" style={{ top: cy + LOCK_H / 2 + 28 }}>
        <motion.h1
          className="text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 16 }} animate={phase >= 2 ? { opacity: 1, y: flying ? -40 : 0 } : {}} transition={{ duration: 0.6 }}
        >
          {t(tier === 'premium' ? 'pw_welcome_premium' : 'pw_welcome_pro')}
        </motion.h1>
        <motion.p
          className="mt-2 max-w-xs text-sm leading-relaxed text-white/60"
          initial={{ opacity: 0 }} animate={phase >= 2 ? { opacity: 1, y: flying ? -40 : 0 } : {}} transition={{ delay: 0.25, duration: 0.6 }}
        >
          {t(tier === 'premium' ? 'pw_unlocked_premium' : 'pw_unlocked_pro')}
        </motion.p>
        <motion.button
          className="pointer-events-auto mt-6 rounded-2xl bg-white px-6 py-3.5 text-sm font-semibold text-black active:scale-[0.98]"
          style={{ marginTop: -16 }}
          initial={{ opacity: 0, y: 10 }} animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0 }} transition={{ duration: 0.4 }}
          onClick={(e) => { e.stopPropagation(); onContinue(); }}
        >
          {t('pw_discover')}
        </motion.button>
      </div>
    </div>
  );
}
