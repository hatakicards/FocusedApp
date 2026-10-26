import { useT } from '@/lib/i18n';

// Tre numeri in fila, senza riquadro: minuti totali, sessioni, giorni di fila.
export default function FocusStats({ sessions, className = '' }) {
  const t = useT();
  const doneSessions = (sessions || []).filter((s) => s.status === 'done');
  if (doneSessions.length === 0) return null;

  const totalMinutes = doneSessions.reduce((sum, s) => sum + (s.actual_minutes ?? s.duration_minutes ?? 0), 0);

  const daysWithSession = new Set(
    doneSessions.map((s) => s.completed_at || (s.scheduled_at || '').slice(0, 10)).filter(Boolean)
  );
  let streak = 0;
  let cursorStr = new Date().toISOString().slice(0, 10);
  while (daysWithSession.has(cursorStr)) {
    streak++;
    const prev = new Date(cursorStr + 'T00:00:00Z');
    prev.setUTCDate(prev.getUTCDate() - 1);
    cursorStr = prev.toISOString().slice(0, 10);
  }

  const items = [
    [totalMinutes, t('ft_stats_minuti')],
    [doneSessions.length, t('ft_stats_sessioni')],
    [streak, t('ft_stats_streak')],
  ];

  return (
    <div className={`grid grid-cols-3 text-center ${className}`}>
      {items.map(([value, label]) => (
        <div key={label}>
          <p className="text-2xl font-bold tabular-nums leading-none">{value}</p>
          <p className="mt-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        </div>
      ))}
    </div>
  );
}
