import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const PAD = 8;

// Un punto della pagina illuminato e il resto oscurato, con la scheda di testo sopra o sotto. Con
// `passthrough` il punto illuminato resta toccabile (es. i rank da premere); il resto no. Senza `target`
// si oscura solo un po' la pagina. Uno scorrimento orizzontale sul fondo chiama onSwipe(+1 / -1).
export default function Spot({ target, passthrough = false, dim = 0.82, sheetAtBottom = false, onSwipe, children }) {
  const [rect, setRect] = useState(null);
  const scrolled = useRef(false);
  const start = useRef(null);

  // La pagina puo' arrivare un attimo dopo (cambio pagina o scheda): si cerca il punto a ogni frame,
  // e la prima volta lo si porta al centro dello schermo.
  useEffect(() => {
    scrolled.current = false;
    setRect(null);
    if (!target) return undefined;
    let raf;
    const tick = () => {
      const el = document.querySelector(target);
      const r = el?.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) {
        if (!scrolled.current) {
          scrolled.current = true;
          // Il punto va un po' sotto il bordo alto (sopra c'e' l'indicatore delle modalita'), cosi' la
          // scheda di testo ci sta sotto.
          const vh = window.innerHeight;
          const fits = r.top >= 70 && r.bottom <= vh * 0.55;
          const desiredTop = r.height > vh * 0.45 ? 70 : vh * 0.14;
          if (!fits) window.scrollBy({ top: r.top - desiredTop, behavior: 'smooth' });
        }
        setRect((prev) => (prev && Math.abs(prev.top - r.top) < 0.5 && Math.abs(prev.left - r.left) < 0.5 && prev.height === r.height && prev.width === r.width ? prev : r));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  const onDown = (e) => { start.current = { x: e.clientX, y: e.clientY }; };
  const onUp = (e) => {
    const s = start.current;
    start.current = null;
    if (!s || !onSwipe) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) onSwipe(dx < 0 ? 1 : -1);
  };

  const hole = rect && { x: rect.left - PAD, y: rect.top - PAD, w: rect.width + PAD * 2, h: rect.height + PAD * 2 };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  // Scheda sotto il punto se e' nella meta' alta, sopra se e' in basso.
  const sheetBelow = !hole || sheetAtBottom || hole.y + hole.h / 2 < vh * 0.5;
  const sheetTop = hole && !sheetAtBottom;

  const block = 'pointer-events-auto absolute touch-none';
  return (
    <div className="pointer-events-none fixed inset-0 z-[90]" onPointerDown={onDown} onPointerUp={onUp}>
      <svg className="pointer-events-none absolute inset-0 h-full w-full">
        <defs>
          <mask id="spot-hole">
            <rect width="100%" height="100%" fill="white" />
            {hole && <rect x={hole.x} y={hole.y} width={hole.w} height={hole.h} rx="16" fill="black" />}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="black" opacity={target && !hole ? 0.6 : dim} mask="url(#spot-hole)" />
      </svg>
      {hole && (
        <motion.div
          key={target}
          className="pointer-events-none absolute rounded-2xl border-2 border-white"
          initial={{ opacity: 0, scale: 1.15 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h, boxShadow: '0 0 22px rgba(255,255,255,0.35)' }}
        />
      )}

      {/* Blocchi che fermano i tocchi: tutto lo schermo, oppure tutto tranne il punto illuminato. */}
      {passthrough && hole ? (
        <>
          <div className={block} style={{ left: 0, top: 0, width: vw, height: Math.max(0, hole.y) }} />
          <div className={block} style={{ left: 0, top: hole.y + hole.h, width: vw, bottom: 0 }} />
          <div className={block} style={{ left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }} />
          <div className={block} style={{ left: hole.x + hole.w, top: hole.y, right: 0, height: hole.h }} />
        </>
      ) : (
        <div className={`${block} inset-0`} />
      )}

      <div
        className="pointer-events-auto absolute inset-x-4 mx-auto max-w-sm"
        style={sheetBelow
          ? { top: sheetTop ? Math.min(hole.y + hole.h + 14, vh - 300) : undefined, bottom: sheetTop ? undefined : 'calc(env(safe-area-inset-bottom) + 18px)' }
          : { bottom: Math.max(vh - hole.y + 14, 18) }}
      >
        {children}
      </div>
    </div>
  );
}
