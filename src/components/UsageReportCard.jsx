import { useCallback, useEffect, useRef, useState } from 'react';
import { Smartphone } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  isScreenTimeSupported, getAuthorizationStatus, requestAuthorization,
  hasUsageEmbed, showUsageEmbed, hideUsageEmbed, setUsageStrings,
} from '@/lib/nativeScreenTime';

const HEIGHT = 250;

// Tempo di utilizzo collegato a Screen Time (solo iOS, solo build con l'estensione di report).
// iOS non lascia che l'app legga il numero: lo mostra una vista di sistema, che qui viene
// incollata sopra la pagina nel rettangolo di questa scheda (il numero grande e, sotto, "per
// quanti anni userai il telefono continuando cosi'"). Quando sopra la pagina compare un
// pannello (finestre, sessione a tutto schermo) la vista si nasconde.
export default function UsageReportCard({ className = '' }) {
  const t = useT();
  const boxRef = useRef(null);
  const [available, setAvailable] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!isScreenTimeSupported()) return undefined;
    let alive = true;
    (async () => {
      const ok = await hasUsageEmbed();
      if (!alive) return;
      setAvailable(ok);
      setChecked(true);
      if (ok) setAuthorized((await getAuthorizationStatus()) === 'authorized');
    })();
    return () => { alive = false; };
  }, []);

  const place = useCallback(() => {
    const el = boxRef.current;
    if (!el) return;
    const overlay = document.querySelector('[role="dialog"], .fixed.inset-0');
    if (overlay) { hideUsageEmbed(); return; }
    const r = el.getBoundingClientRect();
    showUsageEmbed({ x: r.left + window.scrollX, y: r.top + window.scrollY, width: r.width, height: r.height });
  }, []);

  useEffect(() => {
    if (!available || !authorized) return undefined;
    setUsageStrings({
      today: t('pt_today_label'),
      continuing: t('pt_continue'),
      yearOne: t('pt_year_one'),
      yearMany: t('pt_year_many'),
    });
    place();
    const timers = [setTimeout(place, 150), setTimeout(place, 500), setTimeout(place, 1200)];
    const ro = new ResizeObserver(place);
    ro.observe(document.body);
    const mo = new MutationObserver(place);
    mo.observe(document.body, { childList: true });
    window.addEventListener('resize', place);
    return () => {
      timers.forEach(clearTimeout);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener('resize', place);
      hideUsageEmbed();
    };
  }, [available, authorized, place, t]);

  // Mai un campo da compilare: il tempo di utilizzo lo sa da solo il telefono. Finche' questa
  // versione dell'app non contiene l'estensione di report, la scheda lo dice e basta.
  if (!isScreenTimeSupported() || !checked) return null;
  if (!available) {
    return (
      <div className={`flex items-start gap-3 rounded-2xl border border-border bg-card p-4 ${className}`}>
        <Smartphone size={18} className="mt-0.5 shrink-0 text-blue-400" />
        <span>
          <span className="block text-sm font-semibold">{t('opt_usage_title')}</span>
          <span className="block text-xs text-muted-foreground">{t('opt_usage_pending')}</span>
        </span>
      </div>
    );
  }

  if (!authorized) {
    return (
      <button
        onClick={async () => setAuthorized((await requestAuthorization()) === 'authorized')}
        className={`flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left ${className}`}
      >
        <Smartphone size={18} className="text-blue-400" />
        <span>
          <span className="block text-sm font-semibold">{t('opt_usage_title')}</span>
          <span className="block text-xs text-muted-foreground">{t('fb_attiva')}</span>
        </span>
      </button>
    );
  }

  return <div ref={boxRef} className={className} style={{ height: HEIGHT }} />;
}
