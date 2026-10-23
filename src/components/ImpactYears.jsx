import { useT } from '@/lib/i18n';

// Anni di vita davanti al telefono se si continua cosi': ore al giorno x 80 anni di vita.
export const yearsOnPhone = (hoursPerDay) => Math.ceil((hoursPerDay * 80) / 24);

// "Continuando cosi' userai il telefono per" + il numero grande in Impact, bianco.
export default function ImpactYears({ hoursPerDay, className = '' }) {
  const t = useT();
  if (!hoursPerDay || hoursPerDay <= 0) return null;
  const years = yearsOnPhone(hoursPerDay);
  return (
    <div className={`text-center ${className}`}>
      <p className="text-xs font-medium uppercase tracking-widest text-white/60">{t('pt_continue')}</p>
      <p
        className="mt-1 leading-none text-white"
        style={{ fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', 'Avenir Next Condensed', sans-serif", fontSize: '4.5rem', letterSpacing: '0.02em' }}
      >
        {years} <span className="uppercase">{years === 1 ? t('pt_year_one') : t('pt_year_many')}</span>
      </p>
    </div>
  );
}
