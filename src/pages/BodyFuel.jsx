import { useState, useEffect } from 'react';
import { Flame, Plus, Trash2, Pencil, Scale, Ruler, Moon, TrendingDown, Calculator, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useBodyFuelEntries, useUserSettings, useInvalidateAll, useCustomFoods, useOptimisticBodyFuelEntry, useOptimisticCustomFoodSave, useOptimisticSettingsUpdate, useOptimisticEntityDelete } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { computeFoodLogTotals, computeSleepRating, computeCalorieRating, getFoodById, computeFoodMacros } from '@/lib/foodDatabase';
import FoodTracker from '@/components/bodyfuel/FoodTracker';
import MacroChartDialog from '@/components/bodyfuel/MacroChartDialog';
import CalorieCalculator from '@/components/bodyfuel/CalorieCalculator';
import SleepDebtTracker from '@/components/SleepDebtTracker';
import TutorialDialog from '@/components/TutorialDialog';

function calculateSleepDuration(bedtime, wakeTime) {
  if (!bedtime || !wakeTime) return { hours: 0, minutes: 0 };
  const [bedH, bedM] = bedtime.split(':').map(Number);
  const [wakeH, wakeM] = wakeTime.split(':').map(Number);
  const bedTotal = bedH * 60 + bedM;
  const wakeTotal = wakeH * 60 + wakeM;
  let diff;
  if (wakeTotal > bedTotal) diff = wakeTotal - bedTotal;
  else if (wakeTotal < bedTotal) diff = (1440 - bedTotal) + wakeTotal;
  else diff = 0;
  return { hours: Math.floor(diff / 60), minutes: diff % 60 };
}

export default function BodyFuel() {
  const { data: entries } = useBodyFuelEntries();
  const { data: settings } = useUserSettings();
  const { data: customFoods } = useCustomFoods();
  const invalidate = useInvalidateAll();
  const optimisticSave = useOptimisticBodyFuelEntry();
  const optimisticCustomFoodSave = useOptimisticCustomFoodSave();
  const optimisticSettingsUpdate = useOptimisticSettingsUpdate();
  const optimisticDeleteEntry = useOptimisticEntityDelete('BodyFuelEntry', 'bodyFuelEntries');
  const t = useT();
  const { locale } = useI18n();
  const today = todayISO();

  const todayEntry = (entries || []).find((e) => e.date === today);

  const [foodLog, setFoodLog] = useState([]);
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepBedtime, setSleepBedtime] = useState('');
  const [sleepWakeTime, setSleepWakeTime] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [chartDialog, setChartDialog] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);

  useEffect(() => {
    if (todayEntry) {
      setFoodLog(todayEntry.food_log || []);
      setSleepHours(todayEntry.sleep_hours || 0);
      setSleepMinutes(todayEntry.sleep_minutes || 0);
      setSleepBedtime(todayEntry.sleep_bedtime || '');
      setSleepWakeTime(todayEntry.sleep_wake_time || '');
      setWeight(todayEntry.weight?.toString() || '');
      setHeight(todayEntry.height?.toString() || '');
    }
  }, [todayEntry]);

  const totals = computeFoodLogTotals(foodLog, customFoods);
  const sleepRating = computeSleepRating(sleepHours, sleepMinutes);
  const calorieGoal = settings?.daily_calories_goal || 0;
  const calorieRating = computeCalorieRating(totals.kcal, calorieGoal);

  const sorted = [...(entries || [])].sort((a, b) => b.date.localeCompare(a.date));

  const saveEntry = async (partialPayload) => {
    const payload = { date: today, ...partialPayload };
    await optimisticSave(todayEntry, payload);
  };

  const handleAddFood = async (foodId, grams) => {
    const newFoodLog = [...foodLog, { food_id: foodId, grams }];
    setFoodLog(newFoodLog);
    const newTotals = computeFoodLogTotals(newFoodLog, customFoods);
    await saveEntry({
      food_log: newFoodLog,
      calories_consumed: newTotals.kcal,
      protein_consumed: newTotals.protein,
      carbs_consumed: newTotals.carbs,
      lipids_consumed: newTotals.lipids,
    });
  };

  const handleRemoveFood = async (index) => {
    const newFoodLog = foodLog.filter((_, i) => i !== index);
    setFoodLog(newFoodLog);
    const newTotals = computeFoodLogTotals(newFoodLog, customFoods);
    await saveEntry({
      food_log: newFoodLog,
      calories_consumed: newTotals.kcal,
      protein_consumed: newTotals.protein,
      carbs_consumed: newTotals.carbs,
      lipids_consumed: newTotals.lipids,
    });
  };

  const handleEditFood = async (index, newGrams) => {
    const newFoodLog = foodLog.map((item, i) => (i === index ? { ...item, grams: newGrams } : item));
    setFoodLog(newFoodLog);
    const newTotals = computeFoodLogTotals(newFoodLog, customFoods);
    await saveEntry({
      food_log: newFoodLog,
      calories_consumed: newTotals.kcal,
      protein_consumed: newTotals.protein,
      carbs_consumed: newTotals.carbs,
      lipids_consumed: newTotals.lipids,
    });
  };

  const handleSleepChange = async (bedtime, wakeTime) => {
    setSleepBedtime(bedtime);
    setSleepWakeTime(wakeTime);
    const { hours, minutes } = calculateSleepDuration(bedtime, wakeTime);
    setSleepHours(hours);
    setSleepMinutes(minutes);
    const rating = computeSleepRating(hours, minutes);
    await saveEntry({ sleep_bedtime: bedtime, sleep_wake_time: wakeTime, sleep_hours: hours, sleep_minutes: minutes, sleep_quality: rating || null });
  };

  const handleBodySave = async () => {
    await saveEntry({
      weight: weight ? parseFloat(weight) : null,
      height: height ? parseFloat(height) : null,
    });
  };

  const handleAddCustomFood = (foodData) => {
    optimisticCustomFoodSave(foodData).catch(console.error);
  };

  const handleDelete = (id) => {
    optimisticDeleteEntry(id).catch(console.error);
  };

  const macroChartData = (key) =>
    [...(entries || [])]
      .filter((e) => e[key] != null && e[key] !== 0)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((e) => ({
        date: new Date(e.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        value: e[key],
      }));

  const sleepChartData = [...(entries || [])]
    .filter((e) => (e.sleep_hours || 0) > 0 || (e.sleep_minutes || 0) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      date: new Date(e.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      hours: (e.sleep_hours || 0) + (e.sleep_minutes || 0) / 60,
    }));

  const weightEntries = (entries || []).filter((e) => e.weight).sort((a, b) => a.date.localeCompare(b.date));
  const weightTrend = weightEntries.length >= 2
    ? weightEntries[weightEntries.length - 1].weight - weightEntries[0].weight
    : 0;

  const macroBoxes = [
    { key: 'calories_consumed', label: t('bf_calories'), value: totals.kcal, unit: t('bf_kcal'), color: '#ef4444' },
    { key: 'protein_consumed', label: t('bf_proteins'), value: totals.protein, unit: t('bf_g'), color: '#3b82f6' },
    { key: 'carbs_consumed', label: t('bf_carbs'), value: totals.carbs, unit: t('bf_g'), color: '#f59e0b' },
    { key: 'lipids_consumed', label: t('bf_lipids'), value: totals.lipids, unit: t('bf_g'), color: '#a855f7' },
  ];

  const handleEditSave = async () => {
    if (!editEntry) return;
    setSaving(true);
    try {
      const rating = computeSleepRating(editEntry.sleep_hours || 0, editEntry.sleep_minutes || 0);
      const editTotals = computeFoodLogTotals(editEntry.food_log || [], customFoods);
      await optimisticSave(editEntry, {
        weight: editEntry.weight || null,
        height: editEntry.height || null,
        sleep_bedtime: editEntry.sleep_bedtime || null,
        sleep_wake_time: editEntry.sleep_wake_time || null,
        sleep_hours: editEntry.sleep_hours || 0,
        sleep_minutes: editEntry.sleep_minutes || 0,
        sleep_quality: rating || null,
        food_log: editEntry.food_log || [],
        calories_consumed: editTotals.kcal,
        protein_consumed: editTotals.protein,
        carbs_consumed: editTotals.carbs,
        lipids_consumed: editTotals.lipids,
      });
      setEditEntry(null);
    } finally {
      setSaving(false);
    }
  };

  const handleEditAddFood = (foodId, grams) => {
    const newLog = [...(editEntry.food_log || []), { food_id: foodId, grams }];
    setEditEntry({ ...editEntry, food_log: newLog });
  };
  const handleEditRemoveFood = (index) => {
    const newLog = (editEntry.food_log || []).filter((_, i) => i !== index);
    setEditEntry({ ...editEntry, food_log: newLog });
  };
  const handleEditEditFood = (index, newGrams) => {
    const newLog = (editEntry.food_log || []).map((item, i) => (i === index ? { ...item, grams: newGrams } : item));
    setEditEntry({ ...editEntry, food_log: newLog });
  };

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center gap-2">
        <Flame size={22} className="text-red-500" />
        <h1 className="text-2xl font-bold tracking-tight">{t('bf_titolo')}</h1>
      </header>

      {/* Calorie plan (BMR/TDEE calculator) */}
      <button
        onClick={() => setShowCalculator(true)}
        className="w-full rounded-2xl border border-border bg-card p-4 mb-4 text-left active:bg-accent transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-red-500" />
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('nc_plan_title')}</p>
          </div>
          <ChevronRight size={16} className="text-muted-foreground" />
        </div>
        {settings?.daily_calories_goal > 0 ? (
          <div>
            <div className="flex items-baseline gap-1.5 mb-2">
              <p className="text-2xl font-bold tabular-nums">{settings.daily_calories_goal}</p>
              <p className="text-xs text-muted-foreground">{t('bf_kcal')}/{t('nc_day')}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">{t('bf_proteins')}</p>
                <p className="text-sm font-bold text-blue-400 tabular-nums">{settings.protein_goal || 0}{t('bf_g')}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">{t('bf_carbs')}</p>
                <p className="text-sm font-bold text-amber-400 tabular-nums">{settings.carbs_goal || 0}{t('bf_g')}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground">{t('bf_lipids')}</p>
                <p className="text-sm font-bold text-purple-400 tabular-nums">{settings.lipids_goal || 0}{t('bf_g')}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t('nc_no_plan')}</p>
        )}
      </button>

      {/* Food tracker */}
      <FoodTracker foodLog={foodLog} onAdd={handleAddFood} onRemove={handleRemoveFood} onEdit={handleEditFood} customFoods={customFoods || []} onAddCustomFood={handleAddCustomFood} />

      {/* 4 macro boxes */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {macroBoxes.map((m) => (
          <button
            key={m.key}
            onClick={() => setChartDialog(m)}
            className="rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:bg-accent"
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{m.label}</p>
            <p className="text-2xl font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
            <p className="text-[10px] text-muted-foreground">{m.unit}</p>
          </button>
        ))}
      </div>

      {/* Calorie rating */}
      {calorieGoal > 0 && totals.kcal > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('bf_calorie_rating')}</p>
          <p className="text-xs text-muted-foreground mb-3">{t('bf_calorie_rating_q')} ({calorieGoal} {t('bf_kcal')})</p>
          <div className="flex items-center justify-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <div
                key={n}
                className={`h-2.5 flex-1 rounded-full transition-colors ${n <= calorieRating ? 'bg-emerald-500' : 'bg-muted'}`}
              />
            ))}
          </div>
          <p className="text-center text-2xl font-bold mt-2 tabular-nums" style={{ color: calorieRating >= 4 ? '#10b981' : calorieRating >= 3 ? '#f59e0b' : '#ef4444' }}>
            {calorieRating}/5
          </p>
        </div>
      )}
      {calorieGoal === 0 && totals.kcal > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4 text-center">
          <p className="text-xs text-muted-foreground">{t('bf_no_goal')}</p>
        </div>
      )}

      {/* Sleep debt tracker */}
      <SleepDebtTracker />

      {/* Sleep routine */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Moon size={16} className="text-purple-400" />
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('bf_sleep_routine')}</p>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('bf_sleep_bedtime')}</p>
            <input
              type="time"
              value={sleepBedtime}
              onChange={(e) => handleSleepChange(e.target.value, sleepWakeTime)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">{t('bf_sleep_wake')}</p>
            <input
              type="time"
              value={sleepWakeTime}
              onChange={(e) => handleSleepChange(sleepBedtime, e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
          {(sleepHours > 0 || sleepMinutes > 0) && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{t('bf_sleep_duration')}</p>
              <p className="text-sm font-semibold">{sleepHours}h {sleepMinutes}m</p>
            </div>
          )}
          {sleepRating > 0 && (
            <div className="flex items-center justify-center gap-1 rounded-xl bg-purple-500/20 px-3 py-1.5">
              <span className="text-sm font-bold text-purple-400">{sleepRating}/5</span>
            </div>
          )}
        </div>
      </div>

      {/* Sleep trend chart */}
      {sleepChartData.length >= 1 && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-4">
          <p className="text-xs font-semibold mb-3">{t('bf_andamento_sleep')}</p>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={sleepChartData}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
              <YAxis domain={[0, 12]} tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} tickFormatter={(v) => `${v}h`} />
              <Tooltip
                contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'hsl(0 0% 45%)' }}
                formatter={(value) => [`${value.toFixed(1)}h`, t('bf_sleep')]}
              />
              <Line type="monotone" dataKey="hours" stroke="#a855f7" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Height and weight */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{t('bf_height')}</p>
            <div className="flex items-center gap-2">
              <Ruler size={16} className="text-muted-foreground shrink-0" />
              <input
                type="number"
                inputMode="numeric"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder={t('bf_height_ph')}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{t('bf_peso')}</p>
            <div className="flex items-center gap-2">
              <Scale size={16} className="text-muted-foreground shrink-0" />
              <input
                type="number"
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder={t('bf_peso_ph')}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
        {weightEntries.length >= 2 && (
          <div className="flex items-center gap-2 mb-3 text-xs">
            <TrendingDown size={14} className={weightTrend <= 0 ? 'text-emerald-500' : 'text-red-500'} />
            <span className={weightTrend <= 0 ? 'text-emerald-500' : 'text-red-500'}>
              {weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} {t('bf_kg')} {t('bf_trend')}
            </span>
          </div>
        )}
        <button
          onClick={handleBodySave}
          disabled={saving}
          className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2"
        >
          <Plus size={16} /> {saving ? t('salvataggio') : t('salva')}
        </button>
      </div>

      {/* History */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('storico')}</p>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('nessun_dato')}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => {
            const entryTotals = computeFoodLogTotals(e.food_log || [], customFoods);
            return (
              <div key={e.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium capitalize">{new Date(e.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditEntry(e)} className="text-muted-foreground hover:text-foreground">
                      <Pencil size={16} />
                    </button>
                    <button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {(e.calories_consumed || entryTotals.kcal) || 0} {t('bf_kcal')} · P{(e.protein_consumed || entryTotals.protein) || 0} C{(e.carbs_consumed || entryTotals.carbs) || 0} L{(e.lipids_consumed || entryTotals.lipids) || 0}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.sleep_hours || e.sleep_minutes ? `${e.sleep_hours || 0}h ${e.sleep_minutes || 0}m` : ''}{e.sleep_quality ? ` · ${t('bf_sleep_rating')} ${e.sleep_quality}/5` : ''}
                  {e.weight ? ` · ${e.weight} ${t('bf_kg')}` : ''}
                  {e.height ? ` · ${e.height} cm` : ''}
                </p>
                {e.food_log && e.food_log.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {e.food_log.map((item, i) => {
                      const food = getFoodById(item.food_id, customFoods);
                      if (!food) return null;
                      return (
                        <span key={i} className="text-[10px] rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
                          {food.name} {item.grams}{t('bf_g')}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editEntry} onOpenChange={(v) => !v && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('modifica')}</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-3 py-2 max-h-[70vh] overflow-y-auto">
              <p className="text-sm text-muted-foreground capitalize">{new Date(editEntry.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <FoodTracker
                foodLog={editEntry.food_log || []}
                onAdd={handleEditAddFood}
                onRemove={handleEditRemoveFood}
                onEdit={handleEditEditFood}
                customFoods={customFoods || []}
                onAddCustomFood={handleAddCustomFood}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{t('bf_height')}</p>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={editEntry.height || ''}
                    onChange={(e) => setEditEntry({ ...editEntry, height: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder={t('bf_height_ph')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5">{t('bf_peso')}</p>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={editEntry.weight || ''}
                    onChange={(e) => setEditEntry({ ...editEntry, weight: e.target.value ? parseFloat(e.target.value) : null })}
                    placeholder={t('bf_peso_ph')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">{t('bf_sleep_routine')}</p>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('bf_sleep_bedtime')}</p>
                    <input
                      type="time"
                      value={editEntry.sleep_bedtime || ''}
                      onChange={(e) => {
                        const bedtime = e.target.value;
                        const wakeTime = editEntry.sleep_wake_time || '';
                        const { hours, minutes } = calculateSleepDuration(bedtime, wakeTime);
                        const rating = computeSleepRating(hours, minutes);
                        setEditEntry({ ...editEntry, sleep_bedtime: bedtime, sleep_hours: hours, sleep_minutes: minutes, sleep_quality: rating || null });
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{t('bf_sleep_wake')}</p>
                    <input
                      type="time"
                      value={editEntry.sleep_wake_time || ''}
                      onChange={(e) => {
                        const bedtime = editEntry.sleep_bedtime || '';
                        const wakeTime = e.target.value;
                        const { hours, minutes } = calculateSleepDuration(bedtime, wakeTime);
                        const rating = computeSleepRating(hours, minutes);
                        setEditEntry({ ...editEntry, sleep_wake_time: wakeTime, sleep_hours: hours, sleep_minutes: minutes, sleep_quality: rating || null });
                      }}
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setEditEntry(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
              {t('annulla')}
            </button>
            <button onClick={handleEditSave} disabled={saving} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40">
              {saving ? t('salvataggio') : t('salva')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Macro chart dialog */}
      <MacroChartDialog
        open={!!chartDialog}
        onClose={() => setChartDialog(null)}
        title={chartDialog?.label || ''}
        data={chartDialog ? macroChartData(chartDialog.key) : []}
        color={chartDialog?.color || '#ef4444'}
      />
      <CalorieCalculator open={showCalculator} onClose={() => setShowCalculator(false)} />
      <TutorialDialog pageId="bodyfuel" />
    </div>
  );
}