import { useNavigate } from 'react-router-dom';
import { Flame } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useFocusSessions } from '@/lib/useAppData';

function computeStreak(sessions) {
  const doneSessions = (sessions || []).filter((s) => s.status === 'done');
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
  return streak;
}

export default function FocusTimeCard() {
  const navigate = useNavigate();
  const t = useT();
  const { data: sessions } = useFocusSessions();
  const streak = computeStreak(sessions);

  return (
    <button
      onClick={() => navigate('/focus')}
      className="w-full rounded-2xl border border-border bg-card p-6 mb-6 flex flex-col items-center text-center hover:bg-accent/20 transition-colors"
    >
      <div className="relative flex items-center justify-center mb-2">
        <Flame size={88} className="text-orange-500" fill="currentColor" strokeWidth={0} />
        <span className="absolute text-2xl font-black text-background mt-2 tabular-nums">{streak}</span>
      </div>
      <p className="text-sm font-bold">{t('oggi_focus')}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{t('ft_stats_streak')}</p>
    </button>
  );
}
