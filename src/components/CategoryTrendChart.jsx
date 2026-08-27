import { useMemo, useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceArea, ReferenceLine } from 'recharts';
import { useActivities, useRatings } from '@/lib/useAppData';
import { useI18n, useT } from '@/lib/i18n';
import { formatDateISO } from '@/lib/productivity';
import { CATEGORIES } from '@/lib/constants';
import { Check } from 'lucide-react';

const CAT_COLORS = {
  fitness: '#EF4444',
  mente: '#3B82F6',
  apprendimento: '#22C55E',
  sport: '#F59E0B',
  work: '#A855F7',
  studies: '#06B6D4',
};

function mondayOf(date) {
  const x = new Date(date);
  const dow = x.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}
function periodKey(date, mode) {
  const d = new Date(date);
  if (mode === 'month') return formatDateISO(mondayOf(d));
  return formatDateISO(d);
}
function periodLabel(key, mode, locale) {
  return new Date(key + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export default function CategoryTrendChart() {
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { locale } = useI18n();
  const t = useT();
  const [mode, setMode] = useState('week');
  const [selectedCats, setSelectedCats] = useState(() => new Set(CATEGORIES.map((c) => c.id)));

  const data = useMemo(() => {
    const acts = activities || [];
    const all = ratings || [];
    if (all.length === 0) return null;

    const byCat = {};
    CATEGORIES.forEach((c) => {
      const ids = new Set(acts.filter((a) => a.category === c.id).map((a) => a.id));
      byCat[c.id] = all.filter((r) => ids.has(r.activity_id));
    });

    // Generate a continuous sequence of periods so the line is always visible
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const allPeriods = [];
    if (mode === 'week') {
      // Last 7 days, daily granularity
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        allPeriods.push(formatDateISO(d));
      }
    } else {
      // Last 4 weeks, weekly granularity (Monday-based)
      for (let i = 3; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i * 7);
        allPeriods.push(formatDateISO(mondayOf(d)));
      }
    }

    // Only keep periods that have at least one data point, but always include
    // the last (current) period for context
    const periods = allPeriods.filter((pk) =>
      CATEGORIES.some((c) => byCat[c.id].some((r) => periodKey(r.date, mode) === pk))
    );
    if (allPeriods.length > 0 && !periods.includes(allPeriods[allPeriods.length - 1])) {
      periods.push(allPeriods[allPeriods.length - 1]);
    }

    return periods.map((pk) => {
      const row = { label: periodLabel(pk, mode, locale) };
      CATEGORIES.forEach((c) => {
        const rs = byCat[c.id].filter((r) => periodKey(r.date, mode) === pk);
        if (rs.length) {
          row[c.id] = rs.reduce((s, r) => s + r.rating, 0) / rs.length;
        }
      });
      return row;
    });
  }, [activities, ratings, mode, locale]);

  const hasAny = data && data.some((row) => CATEGORIES.some((c) => selectedCats.has(c.id) && row[c.id] != null));

  const toggleCat = (id) => {
    setSelectedCats((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('riep_trend_title')}</p>
        <div className="flex rounded-lg bg-muted p-0.5">
          {[['week', t('riep_settimana')], ['month', t('riep_mese')]].map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${mode === m ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mb-3">{t('riep_trend_sub')}</p>

      {!hasAny ? (
        <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">{t('riep_nessun_dato')}</div>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="zoneRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.12} />
                </linearGradient>
                <linearGradient id="zoneGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.12} />
                  <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <ReferenceArea y1={0} y2={3} fill="url(#zoneRed)" />
              <ReferenceArea y1={3} y2={5} fill="url(#zoneGreen)" />
              <ReferenceLine y={3} stroke="hsl(0 0% 35%)" strokeDasharray="4 4" strokeWidth={1} />
              <XAxis dataKey="label" tick={{ fill: 'hsl(0 0% 45%)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: 'hsl(0 0% 45%)', fontSize: 10 }} axisLine={false} tickLine={false} width={28} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(0 0% 8%)', border: '1px solid hsl(0 0% 15%)', borderRadius: '0.75rem', fontSize: '0.75rem' }}
                labelStyle={{ color: 'hsl(0 0% 70%)' }}
              />
              {CATEGORIES.filter((c) => selectedCats.has(c.id)).map((c) => (
                <Line
                  key={c.id}
                  type="monotone"
                  dataKey={c.id}
                  name={t('cat_' + c.id + '_short')}
                  stroke={CAT_COLORS[c.id]}
                  strokeWidth={2.5}
                  connectNulls
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  dot={{ r: 3, strokeWidth: 0, fill: CAT_COLORS[c.id] }}
                  isAnimationActive={false}
                />
              ))}
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-3 flex justify-center gap-2 flex-wrap">
            {CATEGORIES.map((c) => {
              const active = selectedCats.has(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleCat(c.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-all active:scale-95 ${active ? 'border-transparent bg-foreground/5' : 'border-border text-muted-foreground/50'}`}
                >
                  <span
                    className="flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 transition-colors"
                    style={{ backgroundColor: active ? CAT_COLORS[c.id] : 'transparent', borderColor: CAT_COLORS[c.id] }}
                  >
                    {active && <Check size={9} className="text-white" />}
                  </span>
                  <span className={active ? '' : 'line-through'}>{t('cat_' + c.id + '_short')}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}