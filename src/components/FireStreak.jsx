import { Flame } from 'lucide-react';

// Serie attuale di un'attivita': pillola arancione scuro con una leggera texture a trama.
// Non si mostra a zero giorni.
export default function FireStreak({ streak, className = '' }) {
  if (!streak || streak <= 0) return null;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums text-orange-50 shadow-inner ${className}`}
      style={{
        backgroundColor: '#9a3412',
        backgroundImage: [
          'linear-gradient(135deg, rgba(251,146,60,0.55) 0%, rgba(154,52,18,0) 55%)',
          'repeating-linear-gradient(45deg, rgba(255,255,255,0.09) 0 1.5px, transparent 1.5px 5px)',
          'repeating-linear-gradient(-45deg, rgba(0,0,0,0.18) 0 1.5px, transparent 1.5px 5px)',
        ].join(', '),
        boxShadow: 'inset 0 0 0 1px rgba(251,146,60,0.35)',
      }}
    >
      <Flame size={12} strokeWidth={2.5} className="fill-orange-300/40 text-orange-200" />
      {streak}
    </span>
  );
}
