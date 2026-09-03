import { ComposedChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts';
import { useT } from '@/lib/i18n';

const CAT_COLORS = {
  fitness: '#EF4444',
  mente: '#3B82F6',
  apprendimento: '#22C55E',
  custom: '#F97316',
};

function formatDateShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export default function BarChartRating({ ratings, category }) {
  const t = useT();
  if (!ratings || ratings.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">{t('riep_nessun_dato')}</div>
    );
  }

  const data = [...ratings]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map((r) => ({
      date: r.date,
      label: formatDateShort(r.date),
      rating: r.rating,
    }));

  const lineColor = CAT_COLORS[category] || '#F97316';

  return (
    <ResponsiveContainer width="100%" height={200}>
      <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="zoneRedBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" stopOpacity={0} />
            <stop offset="100%" stopColor="#EF4444" stopOpacity={0.12} />
          </linearGradient>
          <linearGradient id="zoneGreenBar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22C55E" stopOpacity={0.12} />
            <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <ReferenceArea y1={0} y2={3} fill="url(#zoneRedBar)" />
        <ReferenceArea y1={3} y2={5} fill="url(#zoneGreenBar)" />
        <ReferenceLine y={3} stroke="hsl(0 0% 35%)" strokeDasharray="4 4" strokeWidth={1} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'hsl(0 0% 45%)', fontSize: 9 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 5]}
          ticks={[1, 2, 3, 4, 5]}
          tick={{ fill: 'hsl(0 0% 45%)', fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(0 0% 8%)',
            border: '1px solid hsl(0 0% 15%)',
            borderRadius: '0.75rem',
            fontSize: '0.75rem',
          }}
          labelStyle={{ color: 'hsl(0 0% 70%)' }}
        />
        <Line
          type="monotone"
          dataKey="rating"
          stroke={lineColor}
          strokeWidth={2.5}
          connectNulls
          activeDot={{ r: 5, strokeWidth: 0 }}
          dot={{ r: 3, strokeWidth: 0, fill: lineColor }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}