import { useMemo } from 'react';
import { Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ComposedChart, CartesianGrid } from 'recharts';
import { useT, useI18n } from '@/lib/i18n';

const CURRENCY = '€';

function formatMoney(n) {
  return `${(n || 0).toFixed(0)} ${CURRENCY}`;
}

function formatMoneyShort(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return (n || 0).toFixed(0);
}

function SimpleTooltip({ active, payload, label, t }) {
  if (!active || !payload || !payload.length) return null;
  const cumulative = payload.find((p) => p.dataKey === 'cumulativo')?.value || 0;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-xl">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">{label}</p>
      <p className="text-sm font-bold tabular-nums">{formatMoney(cumulative)}</p>
      <p className="text-[10px] text-muted-foreground">{t('ws_guadagnato_mese')}</p>
    </div>
  );
}

export default function EarningsChart({ logs, goal, locale }) {
  const t = useT();

  const chartData = useMemo(() => {
    const sorted = [...logs]
      .filter((l) => l.earnings)
      .sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    return sorted.map((l) => {
      running += l.earnings;
      return {
        date: new Date(l.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        cumulativo: running,
      };
    });
  }, [logs, locale]);

  if (chartData.length < 1) return null;

  const totalEarned = chartData[chartData.length - 1].cumulativo;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-baseline justify-between mb-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">{t('ws_earn_andamento')}</p>
          <p className="text-xl font-bold tabular-nums">{formatMoney(totalEarned)}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={chartData} margin={{ top: 5, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id="earnTrend" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="2 4" stroke="hsl(0 0% 16%)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 9, fill: 'hsl(0 0% 45%)' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={20}
          />
          <YAxis
            tick={{ fontSize: 9, fill: 'hsl(0 0% 45%)' }}
            tickLine={false}
            axisLine={false}
            width={36}
            tickFormatter={(v) => formatMoneyShort(v)}
          />
          <Tooltip content={<SimpleTooltip t={t} />} />
          <Area
            type="monotone"
            dataKey="cumulativo"
            stroke="#22c55e"
            strokeWidth={2}
            fill="url(#earnTrend)"
            dot={false}
            activeDot={{ r: 4, fill: '#22c55e', stroke: '#0a0a0a', strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}