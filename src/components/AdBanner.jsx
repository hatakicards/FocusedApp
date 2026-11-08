import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { useT } from '@/lib/i18n';

const ROTATE_MS = 6000;
const AURUM_URL = 'https://aurum-axv.pages.dev';

// Frasi motivazionali a ruota, alternate alle 4 frasi dello sponsor Aurum (budget per singoli e famiglie).
// Etichetta "Pubblicita'" sempre visibile; niente "investi", rendimenti o cifre promesse.
const MESSAGES = [
  { text: 'bn_m1' },
  { aurum: 'aurum_1' },
  { text: 'bn_m2' },
  { text: 'bn_m3' },
  { aurum: 'aurum_2' },
  { text: 'bn_m4' },
  { text: 'bn_m5' },
  { aurum: 'aurum_3' },
  { text: 'bn_m6' },
  { text: 'bn_m7' },
  { aurum: 'aurum_4' },
  { text: 'bn_m8' },
];

// "Aurum" in grassetto dentro la frase.
const withBrand = (s) => s.split(/(Aurum)/).map((part, i) => (
  part === 'Aurum' ? <b key={i} className="font-semibold text-foreground">Aurum</b> : part
));

export default function AdBanner() {
  const t = useT();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIndex((i) => (i + 1) % MESSAGES.length), ROTATE_MS);
    return () => clearInterval(timer);
  }, []);

  const msg = MESSAGES[index];
  // Solo un link, senza dati dell'utente. Nell'app si apre nel browser di sistema, cosi' Aurum non
  // sembra una schermata di Focused.
  const openAurum = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Browser } = await import('@capacitor/browser');
        await Browser.open({ url: AURUM_URL });
        return;
      }
    } catch { /* ripiego sotto */ }
    try { window.open(AURUM_URL, '_blank', 'noopener'); } catch { /* ignore */ }
  };

  // Altezza fissa: cambiando frase la barra non deve mai muoversi.
  return (
    <button
      type="button"
      onClick={msg.aurum ? openAurum : undefined}
      className={`relative flex h-7 w-full items-center justify-center overflow-hidden border-b border-border bg-secondary/60 px-3 text-center transition-colors ${msg.aurum ? 'hover:bg-secondary' : 'cursor-default'}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"
        >
          {msg.aurum ? (
            <>
              <img src="/images/aurum-logo.png" alt="" className="h-4 w-4 shrink-0 rounded-[4px]" />
              <span className="truncate">{withBrand(t(msg.aurum))}</span>
              <span className="shrink-0 rounded border border-border px-1 text-[9px] uppercase tracking-wide">{t('aurum_ad_label')}</span>
            </>
          ) : (
            <span className="truncate">{t(msg.text)}</span>
          )}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
