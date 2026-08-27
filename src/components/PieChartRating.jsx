import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { RATING_COLORS } from '@/lib/constants';
import { useT } from '@/lib/i18n';

export default function PieChartRating({ ratings }) {
  const t = useT();
  if (!ratings || ratings.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">{t('riep_nessun_dato')}</div>
    );
  }

  const green = ratings.filter((r) => r.rating >= 4).length;
  const yellow = ratings.filter((r) => r.rating === 3).length;
  const red = ratings.filter((r) => r.rating <= 2).length;

  const data = [
    { name: t('pc_positivi'), value: green, color: '#22C55E' },
    { name: t('pc_media'), value: yellow, color: '#EAB308' },
    { name: t('pc_negativi'), value: red, color: '#EF4444' },
  ].filter((d) => d.value > 0);

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={85}
            paddingAngle={3}
            stroke="none"
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(0 0% 8%)',
              border: '1px solid hsl(0 0% 15%)',
              borderRadius: '0.75rem',
              fontSize: '0.75rem',
            }}
            labelStyle={{ color: 'hsl(0 0% 70%)' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="mt-3 flex justify-center gap-4 flex-wrap">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-xs text-muted-foreground">{d.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}