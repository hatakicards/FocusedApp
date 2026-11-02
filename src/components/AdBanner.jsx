import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useT } from '@/lib/i18n';

const ROTATE_MS = 6000;

// Frasi motivazionali a ruota; ogni tre ne compare uno spazio per gli annunci su Focused.
const MESSAGES = [
  { text: 'bn_m1' },
  { text: 'bn_m2' },
  { text: 'bn_m3' },
  { title: 'wwu_ads_title', sub: 'wwu_ads_sub', ad: true },
  { text: 'bn_m4' },
  { text: 'bn_m5' },
  { text: 'bn_m6' },
  { title: 'ad2_title', sub: 'ad2_sub', ad: true },
  { text: 'bn_m7' },
  { text: 'bn_m8' },
];

export default function AdBanner() {
  const t = useT();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const msg = MESSAGES[index];
  const label = msg.ad ? `${t(msg.title)} — ${t(msg.sub)}` : t(msg.text);

  // Altezza fissa: cambiando frase la barra non deve mai muoversi.
  return (
    <button
      type="button"
      onClick={msg.ad ? () => navigate('/work-with-us') : undefined}
      className={`relative flex h-7 w-full items-center justify-center overflow-hidden border-b border-border bg-secondary/60 px-3 text-center transition-colors ${msg.ad ? 'hover:bg-secondary' : 'cursor-default'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="truncate text-[11px] text-muted-foreground"
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
