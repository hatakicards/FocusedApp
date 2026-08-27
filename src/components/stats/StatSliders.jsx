import { getLifeStatsForProfile } from '@/lib/statsConfig';
import { useT } from '@/lib/i18n';

export default function StatSliders({ values, onChange, disabled, profileType }) {
  const t = useT();
  const stats = getLifeStatsForProfile(profileType || 'base');
  return (
    <div className="space-y-5">
      {stats.map((s) => {
        const Icon = s.icon;
        const val = values[s.id] ?? 5;
        return (
          <div key={s.id} className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border"
              style={{ color: s.color }}
            >
              <Icon size={18} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-medium">{t('stat_' + s.id)}</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: s.color }}>
                  {val}
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={val}
                disabled={disabled}
                onChange={(e) => onChange({ ...values, [s.id]: Number(e.target.value) })}
                className="w-full cursor-pointer disabled:opacity-50"
                style={{ accentColor: s.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}