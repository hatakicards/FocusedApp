import { useState } from 'react';
import { Flame } from 'lucide-react';
import { useT } from '@/lib/i18n';
import FocusScoreChart from '@/components/FocusScoreChart';

export default function FocusScore({ score, ratings, dayEntries, goals }) {
  const t = useT();
  const [chartOpen, setChartOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setChartOpen(true)}
        className="flex items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-1.5 hover:bg-accent transition-colors"
        title={t('focus_score')}
      >
        <Flame size={16} className="text-foreground" strokeWidth={2.5} />
        <span className="text-sm font-bold tabular-nums leading-none">{score}</span>
        <span className="text-[10px] text-muted-foreground leading-none">/100</span>
      </button>
      <FocusScoreChart
        open={chartOpen}
        onClose={() => setChartOpen(false)}
        ratings={ratings}
        dayEntries={dayEntries}
        goals={goals}
      />
    </>
  );
}