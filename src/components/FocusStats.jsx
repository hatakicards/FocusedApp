import { useT } from '@/lib/i18n';

export default function FocusStats({ sessions }) {
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

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6 grid grid-cols-3 divide-x divide-border text-center">
      <div>
        <p className="text-2xl font-bold tabular-nums">{totalMinutes}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t('ft_stats_minuti')}</p>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{doneSessions.length}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t('ft_stats_sessioni')}</p>
      </div>
      <div>
        <p className="text-2xl font-bold tabular-nums">{streak}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{t('ft_stats_streak')}</p>
      </div>
    </div>
  );
}
