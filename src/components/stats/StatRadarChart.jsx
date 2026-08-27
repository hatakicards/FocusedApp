import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from 'recharts';
import { getLifeStatsForProfile } from '@/lib/statsConfig';
import { useT } from '@/lib/i18n';

export default function StatRadarChart({ baseline, current, profileType }) {
  const t = useT();
  const stats = getLifeStatsForProfile(profileType || 'base');
  const data = stats.map((s) => ({
    stat: t('stat_' + s.id),
    Inizio: baseline?.[s.id] ?? 0,
    Attuale: current?.[s.id] ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <RadarChart data={data}>
        <PolarGrid stroke="hsl(var(--border))" />
        <PolarAngleAxis dataKey="stat" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
        <Radar name={t('stat_inizio')} dataKey="Inizio" stroke="hsl(var(--muted-foreground))" fill="hsl(var(--muted-foreground))" fillOpacity={0.15} />
        <Radar name={t('stat_attuale')} dataKey="Attuale" stroke="hsl(var(--foreground))" fill="hsl(var(--foreground))" fillOpacity={0.3} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}