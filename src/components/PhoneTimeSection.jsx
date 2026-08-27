import { useState, useEffect } from 'react';
import { Smartphone, Settings } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { usePhoneTimeEntries, useUserSettings, useOptimisticPhoneTimeSave, useOptimisticSettingsUpdate } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

function calculateYearsOnPhone(hoursPerDay) {
  return Math.ceil((hoursPerDay * 365 * 80) / (24 * 365));
}

export default function PhoneTimeSection({ activityId }) {
  const t = useT();
  const { locale } = useI18n();
  const { data: entries } = usePhoneTimeEntries();
  const { data: settings } = useUserSettings();
  const optimisticSave = useOptimisticPhoneTimeSave();
  const optimisticSettingsUpdate = useOptimisticSettingsUpdate();
  const today = todayISO();

  const todayEntry = (entries || []).find((e) => e.date === today);
  const [hours, setHours] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [avgDaily, setAvgDaily] = useState('');
  const [reductionGoal, setReductionGoal] = useState('');

  useEffect(() => {
    setHours(todayEntry?.hours?.toString() || '');
  }, [todayEntry]);

  useEffect(() => {
    setAvgDaily(settings?.phone_average_daily?.toString() || '');
    setReductionGoal(settings?.phone_reduction_goal?.toString() || '');
  }, [settings]);

  const handleSaveHours = async () => {
    if (!hours) return;
    const h = parseFloat(hours);
    await optimisticSave(todayEntry, { date: today, hours: h });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    await optimisticSettingsUpdate(settings.id, {
      phone_average_daily: avgDaily ? parseFloat(avgDaily) : 0,
      phone_reduction_goal: reductionGoal ? parseFloat(reductionGoal) : 0,
    });
    setShowSettings(false);
  };

  const todayHours = parseFloat(hours) || 0;
  const yearsOnPhone = calculateYearsOnPhone(todayHours);
  const reductionGoalValue = settings?.phone_reduction_goal || 0;
  const isGood = reductionGoalValue > 0 && todayHours <= reductionGoalValue;
  const isBad = reductionGoalValue > 0 && todayHours > reductionGoalValue;

  const chartData = [...(entries || [])]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      date: new Date(e.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      hours: e.hours,
    }));

  return (
    <>
      <div className="mb-8 rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Smartphone size={16} className="text-blue-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('pt_today_usage')}</p>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="24"
            step="0.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            onBlur={handleSaveHours}
            placeholder="0"
            className="w-24 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-center outline-none [color-scheme:dark]"
          />
          <span className="text-xs text-muted-foreground">h</span>
          <button
            onClick={() => setShowSettings(true)}
            className="ml-auto rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
        {todayHours > 0 && (
          <div className="space-y-2">
            {reductionGoalValue > 0 && (
              <p className={`text-sm font-semibold ${isGood ? 'text-emerald-500' : 'text-red-500'}`}>
                {isGood ? t('pt_good') : t('pt_bad')}
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              {t('pt_years').replace('{years}', yearsOnPhone)}
            </p>
          </div>
        )}
      </div>

      {chartData.length >= 1 && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold mb-3">{t('pt_trend')}</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
              <YAxis domain={[0, 24]} tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} tickFormatter={(v) => `${v}h`} />
              <Tooltip
                contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'hsl(0 0% 45%)' }}
                formatter={(value) => [`${value}h`, t('pt_hours')]}
              />
              <Line type="monotone" dataKey="hours" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('pt_settings')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('pt_avg_daily')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="24"
                  step="0.5"
                  value={avgDaily}
                  onChange={(e) => setAvgDaily(e.target.value)}
                  placeholder="0"
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-center outline-none [color-scheme:dark]"
                />
                <span className="text-xs text-muted-foreground">h/giorno</span>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">{t('pt_reduction_goal')}</p>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  max="24"
                  step="0.5"
                  value={reductionGoal}
                  onChange={(e) => setReductionGoal(e.target.value)}
                  placeholder="0"
                  className="w-24 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-center outline-none [color-scheme:dark]"
                />
                <span className="text-xs text-muted-foreground">h/giorno</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setShowSettings(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">{t('annulla')}</button>
            <button onClick={handleSaveSettings} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">{t('salva')}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}