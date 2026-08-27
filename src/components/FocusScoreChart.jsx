import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Flame } from 'lucide-react';
import { useT, useI18n } from '@/lib/i18n';
import { computeFocusScoreForDate, formatDateISO } from '@/lib/productivity';

export default function FocusScoreChart({ open, onClose, ratings, dayEntries, goals }) {
  const t = useT();
  const { locale } = useI18n();

  const data = useMemo(() => {
    const days = 30;
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = formatDateISO(d);
      const score = computeFocusScoreForDate(ratings, dayEntries, goals, dateStr);
      const label = d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
      result.push({ date: dateStr, score, label });
    }
    return result;
  }, [ratings, dayEntries, goals, locale]);

  const todayScore = data[data.length - 1]?.score || 0;
  const avgScore = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.score, 0) / data.length) : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flame size={18} className="text-foreground" />
            {t('focus_score_trend')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center justify-around mb-2">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{todayScore}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('focus_score_today')}</p>
          </div>
          <div className="w-px h-10 bg-border" />
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums">{avgScore}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('focus_score_avg_30')}</p>
          </div>
        </div>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 14%)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: 'hsl(0 0% 45%)' }}
                interval={5}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 9, fill: 'hsl(0 0% 45%)' }}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  background: 'hsl(0 0% 4%)',
                  border: '1px solid hsl(0 0% 14%)',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: 'hsl(0 0% 96%)' }}
                formatter={(value) => [`${value}/100`, t('focus_score')]}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(0 0% 96%)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(0 0% 96%)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </DialogContent>
    </Dialog>
  );
}