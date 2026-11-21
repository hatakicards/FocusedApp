import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Pencil, Scale, Ruler, Moon, TrendingDown, Calculator, ChevronRight, ChevronDown, Dumbbell, Utensils, Sparkles, Beef, Wheat, Droplet, Flame } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useBodyFuelEntries, useUserSettings, useInvalidateAll, useCustomFoods, useOptimisticBodyFuelEntry, useOptimisticCustomFoodSave, useOptimisticSettingsUpdate, useOptimisticEntityDelete, useSubscription } from '@/lib/useAppData';
import { useAuth } from '@/lib/AuthContext';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { computeFoodLogTotals, computeCalorieRating, getFoodById } from '@/lib/foodDatabase';
import FoodTracker from '@/components/bodyfuel/FoodTracker';
import MacroChartDialog from '@/components/bodyfuel/MacroChartDialog';
import CalorieCalculator from '@/components/bodyfuel/CalorieCalculator';
import SleepDebtTracker from '@/components/SleepDebtTracker';
import NapsCard from '@/components/bodyfuel/NapsCard';
import { entrySleepRating, entrySleepMinutes } from '@/lib/sleepData';
import GymSection from '@/components/bodyfuel/GymSection';
import FocusyAssistant from '@/components/FocusyAssistant';
import { isSenseEnabled, getSleepFromHealth, getNapsFromHealth } from '@/lib/healthSense';
import HealthSources from '@/components/HealthSources';
import TutorialDialog from '@/components/TutorialDialog';
import HelpButton from '@/components/HelpButton';
import LockedPreview from '@/components/LockedPreview';
import { useTourTab } from '@/lib/planWelcome';

// Athlete (1.5): tre sezioni, Gym, Food e Sleep. Si apre sempre su Food.
const TABS = [['food', Utensils, 'bfn_food', '#f97316'], ['gym', Dumbbell, 'bfn_gym', '#10b981'], ['sleep', Moon, 'bfn_sleep', '#a855f7']];

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

function BodyFuelInner() {
  const qc = useQueryClient();
  const { user } = useAuth();
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
  const sub = useSubscription();
  const today = todayISO();

  const todayEntry = (entries || []).find((e) => e.date === today);

  const [foodLog, setFoodLog] = useState([]);
  const [sleepHours, setSleepHours] = useState(0);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const [sleepBedtime, setSleepBedtime] = useState('');
  const [sleepWakeTime, setSleepWakeTime] = useState('');
  const [naps, setNaps] = useState([]);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [chartDialog, setChartDialog] = useState(null);
  const [editEntry, setEditEntry] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingFood, setSavingFood] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sleepAuto, setSleepAuto] = useState(false);
  const [tab, setTab] = useState('food');
  useTourTab('athlete', setTab);
  const [focusyOpen, setFocusyOpen] = useState(false);
  // Le aggiunte/rimozioni/modifiche cibo sono asincrone; senza questa coda,
  // due tap ravvicinati potevano generare due salvataggi in parallelo e
  // quello piu' lento a rispondere sovrascriveva l'altro nella cache
  // (il "glitch": l'alimento appena aggiunto spariva e le barre tornavano
  // indietro). Mettendoli in coda, ogni salvataggio parte solo dopo che il
  // precedente e' davvero tornato dal server.
  const saveChainRef = useRef(Promise.resolve());
  // Il caricamento dal server deve avvenire una volta sola per data. Se
  // questo effect si ri-attivasse a ogni cambio di `todayEntry" (come
  // faceva prima), ogni volta che un NOSTRO salvataggio tornava dal
  // server avrebbe ri-sincronizzato lo stato locale con quello che il
  // server aveva IN QUEL momento — che durante una raffica di aggiunte
  // ravvicinate e' spesso gia' superato da un salvataggio successivo
  // ancora in corso, cancellando l'ultima modifica dall'interfaccia.
  const loadedDateRef = useRef(null);
  // Fonte di verita' sincrona per il food log, aggiornata SOLO da noi (mai
  // da React). Serve perche' l'updater funzionale di setFoodLog non viene
  // sempre eseguito in modo sincrono: se un secondo tap arriva prima che il
  // primo abbia fatto il suo render, React salta il calcolo "eager" e la
  // callback dell'updater gira solo piu' tardi, durante il render vero e
  // proprio. Lo stato React finale resta corretto, ma se leggessimo il
  // nuovo array da li' per salvarlo sul server, in quel secondo tap
  // avremmo ancora `undefined` -> il salvataggio manderebbe food_log
  // mancante e cancellerebbe quanto appena aggiunto dal primo tap.
  const foodLogRef = useRef([]);

  useEffect(() => {
    if (!entries || loadedDateRef.current === today) return;
    loadedDateRef.current = today;
    if (todayEntry) {
      foodLogRef.current = todayEntry.food_log || [];
      setFoodLog(todayEntry.food_log || []);
      setSleepHours(todayEntry.sleep_hours || 0);
      setSleepMinutes(todayEntry.sleep_minutes || 0);
      setSleepBedtime(todayEntry.sleep_bedtime || '');
      setSleepWakeTime(todayEntry.sleep_wake_time || '');
      setNaps(todayEntry.naps || []);
      setWeight(todayEntry.weight?.toString() || '');
      setHeight(todayEntry.height?.toString() || '');
    }
  }, [entries, today, todayEntry]);

  // Sonno rilevato da Salute: se stanotte non e' ancora stato inserito, orari di addormentamento
  // e risveglio si compilano da soli (si possono sempre correggere a mano).
  const autoSleepRef = useRef(false);
  useEffect(() => {
    if (!sub.canUseProfiles || entries === undefined || autoSleepRef.current || !isSenseEnabled()) return;
    if (todayEntry?.sleep_bedtime) return;
    autoSleepRef.current = true;
    (async () => {
      const nights = await getSleepFromHealth(2);
      const night = nights.filter((n) => n.date === today).sort((a, b) => b.minutes - a.minutes)[0];
      if (!night) return;
      const hhmm = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
      setSleepAuto(true);
      handleSleepChange(hhmm(night.bedtime), hhmm(night.wake));
    })();
  }, [todayEntry?.id, entries === undefined, sub.canUseProfiles]);

  // Pisolini rilevati da Salute: se oggi non ne hai ancora inseriti, compaiono da soli.
  const autoNapsRef = useRef(false);
  useEffect(() => {
    if (!sub.canUseProfiles || entries === undefined || autoNapsRef.current || !isSenseEnabled()) return;
    if (todayEntry?.naps?.length) return;
    autoNapsRef.current = true;
    (async () => {
      const found = (await getNapsFromHealth(1)).filter((n) => n.date === today);
      if (found.length) handleNapsChange(found.map((n) => ({ start: n.start, end: n.end, auto: true })));
    })();
  }, [todayEntry?.id, entries === undefined, sub.canUseProfiles]);

  const totals = computeFoodLogTotals(foodLog, customFoods);
  const sleepRating = entrySleepRating({ sleep_hours: sleepHours, sleep_minutes: sleepMinutes, naps });
  const calorieGoal = settings?.daily_calories_goal || 0;
  const calorieRating = computeCalorieRating(totals.kcal, calorieGoal);

  const sorted = [...(entries || [])].sort((a, b) => b.date.localeCompare(a.date));

  const saveEntry = (partialPayload) => {
    const payload = { date: today, ...partialPayload };
    // Rilegge la entry di oggi dalla cache al momento in cui il salvataggio
    // *parte davvero* (non quando e' stato richiesto): con la coda, un
    // secondo salvataggio in fila puo' partire dopo che il primo ha gia'
    // creato la entry di oggi. Se qui si usasse ancora il "todayEntry"
    // catturato al click, risulterebbe ancora inesistente e il secondo
    // salvataggio ne creerebbe una seconda invece di aggiornare la prima.
    const run = () => {
      const current = qc.getQueryData(['bodyFuelEntries', user?.id]) || [];
      const existing = current.find((e) => e.date === today);
      return optimisticSave(existing, payload);
    };
    const next = saveChainRef.current.then(run, run);
    saveChainRef.current = next.catch(() => {});
    return next;
  };

  const saveFoodLog = async (newFoodLog) => {
    const newTotals = computeFoodLogTotals(newFoodLog, customFoods);
    setSavingFood(true);
    try {
      await saveEntry({
        food_log: newFoodLog,
        calories_consumed: newTotals.kcal,
        calories_goal: calorieGoal || null,
        protein_consumed: newTotals.protein,
        carbs_consumed: newTotals.carbs,
        lipids_consumed: newTotals.lipids,
      });
    } finally {
      setSavingFood(false);
    }
  };

  const handleAddFood = async (foodId, grams) => {
    const newItem = { food_id: foodId, grams, _id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    const newFoodLog = [...foodLogRef.current, newItem];
    foodLogRef.current = newFoodLog;
    setFoodLog(newFoodLog);
    await saveFoodLog(newFoodLog);
  };

  const handleRemoveFood = async (index) => {
    const newFoodLog = foodLogRef.current.filter((_, i) => i !== index);
    foodLogRef.current = newFoodLog;
    setFoodLog(newFoodLog);
    await saveFoodLog(newFoodLog);
  };

  const handleEditFood = async (index, newGrams) => {
    const newFoodLog = foodLogRef.current.map((item, i) => (i === index ? { ...item, grams: newGrams } : item));
    foodLogRef.current = newFoodLog;
    setFoodLog(newFoodLog);
    await saveFoodLog(newFoodLog);
  };

  const handleSleepChange = async (bedtime, wakeTime) => {
    setSleepBedtime(bedtime);
    setSleepWakeTime(wakeTime);
    const { hours, minutes } = calculateSleepDuration(bedtime, wakeTime);
    setSleepHours(hours);
    setSleepMinutes(minutes);
    const rating = entrySleepRating({ sleep_hours: hours, sleep_minutes: minutes, naps });
    await saveEntry({ sleep_bedtime: bedtime, sleep_wake_time: wakeTime, sleep_hours: hours, sleep_minutes: minutes, sleep_quality: rating || null });
  };

  const handleNapsChange = async (next) => {
    setNaps(next);
    const rating = entrySleepRating({ sleep_hours: sleepHours, sleep_minutes: sleepMinutes, naps: next });
    await saveEntry({ naps: next, sleep_quality: rating || null });
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
    .filter((e) => entrySleepMinutes(e) > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((e) => ({
      date: new Date(e.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      hours: entrySleepMinutes(e) / 60,
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
      const rating = entrySleepRating(editEntry);
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
        calories_goal: editEntry.calories_goal || calorieGoal || null,
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

  const selectTab = (id) => setTab(id);

  // Focusy ha registrato del cibo: la lista di oggi si ricarica dal server.
  const handleFocusyChange = async (open) => {
    setFocusyOpen(open);
    if (open) return;
    await qc.refetchQueries({ queryKey: ['bodyFuelEntries', user?.id] });
    const fresh = (qc.getQueryData(['bodyFuelEntries', user?.id]) || []).find((e) => e.date === today);
    if (fresh?.food_log) {
      foodLogRef.current = fresh.food_log;
      setFoodLog(fresh.food_log);
    }
  };

  const macroCards = [
    { ...macroBoxes[1], goal: settings?.protein_goal || 0, Icon: Beef },
    { ...macroBoxes[2], goal: settings?.carbs_goal || 0, Icon: Wheat },
    { ...macroBoxes[3], goal: settings?.lipids_goal || 0, Icon: Droplet },
  ];
  const sleepTotalMin = entrySleepMinutes({ sleep_hours: sleepHours, sleep_minutes: sleepMinutes, naps });
  const napMin = Math.max(0, sleepTotalMin - (sleepHours * 60 + sleepMinutes));
  const calPct = calorieGoal > 0 ? Math.min(100, Math.round((totals.kcal / calorieGoal) * 100)) : 0;

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-5 flex items-start justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t('personal_athlete')}</h1>
        <HelpButton pageId="bodyfuel" className="mt-1" />
      </header>

      {/* Gym · Food · Sleep */}
      <div className="mb-6 grid grid-cols-3 gap-1 rounded-full bg-foreground/[0.06] p-1" role="tablist">
        {TABS.map(([id, Icon, key, color]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => selectTab(id)}
            className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-xs font-semibold transition-colors ${tab === id ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            <Icon size={14} strokeWidth={2} style={{ color }} /> {t(key)}
          </button>
        ))}
      </div>

      {tab === 'gym' && (
        <div>
          <GymSection />
        </div>
      )}

      {tab === 'food' && (
        <div>
          {/* Calorie di oggi, grandi (il tour evidenzia calorie + macro) */}
          <div data-tour="bf-food">
          <button
            onClick={() => setChartDialog(macroBoxes[0])}
            className="relative mb-3 w-full overflow-hidden rounded-3xl border border-border bg-card p-5 text-left transition-transform active:scale-[0.99]"
          >
            <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: '#f97316' }} />
            <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"><Flame size={13} style={{ color: '#f97316' }} /> {t('bf_calories')}</p>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="titanium-text text-6xl font-extrabold leading-none tabular-nums">{totals.kcal}</span>
              <span className="text-sm text-muted-foreground">{calorieGoal > 0 ? `/ ${calorieGoal} ${t('bf_kcal')}` : t('bf_kcal')}</span>
            </div>
            {calorieGoal > 0 ? (
              <>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${calPct}%`, background: 'linear-gradient(90deg, #fbbf24, #f97316, #ef4444)' }} />
                </div>
                {totals.kcal > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">{t('bf_calorie_rating')}: <span className="font-semibold text-foreground">{calorieRating}/5</span></p>
                )}
              </>
            ) : (
              totals.kcal > 0 && <p className="mt-2 text-xs text-muted-foreground">{t('bf_no_goal')}</p>
            )}
          </button>

          {/* Macro, tre riquadri come i piani */}
          <div className="mb-6 grid grid-cols-3 gap-3">
            {macroCards.map(({ key, label, value, goal, Icon, unit, color }) => (
              <button
                key={key}
                onClick={() => setChartDialog(macroBoxes.find((m) => m.key === key))}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center transition-colors active:bg-accent"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-black" style={{ boxShadow: `inset 0 0 0 1px ${color}55` }}>
                  <Icon size={20} strokeWidth={1.75} style={{ color }} />
                </span>
                <span className="text-lg font-bold leading-none tabular-nums">{Math.round(value)}<span className="text-xs font-semibold text-muted-foreground">{unit}</span></span>
                <span className="text-[10px] text-muted-foreground">{goal > 0 ? `/ ${goal}${unit} · ` : ''}{label}</span>
                {goal > 0 && (
                  <span className="h-1 w-full overflow-hidden rounded-full bg-muted">
                    <span className="block h-full rounded-full" style={{ width: `${Math.min(100, Math.round((value / goal) * 100))}%`, backgroundColor: color }} />
                  </span>
                )}
              </button>
            ))}
          </div>
          </div>

          <FoodTracker foodLog={foodLog} onAdd={handleAddFood} onRemove={handleRemoveFood} onEdit={handleEditFood} customFoods={customFoods || []} onAddCustomFood={handleAddCustomFood} saving={savingFood} />

          {/* Focusy registra il cibo da solo */}
          <button
            onClick={() => setFocusyOpen(true)}
            className="titanium-bg mb-8 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left transition-transform active:scale-[0.98]"
          >
            <Sparkles size={20} className="shrink-0" />
            <span className="text-sm font-bold leading-snug">{t('bfn_focusy_food')}</span>
          </button>

          {/* Piano alimentare */}
          <button
            onClick={() => setShowCalculator(true)}
            className="mb-8 w-full rounded-2xl border border-border bg-card p-4 text-left transition-colors active:bg-accent"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator size={16} style={{ color: '#f97316' }} />
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('nc_plan_title')}</p>
              </div>
              <ChevronRight size={16} className="text-muted-foreground" />
            </div>
            {settings?.daily_calories_goal > 0 ? (
              <div>
                <div className="mb-2 flex items-baseline gap-1.5">
                  <p className="text-2xl font-bold tabular-nums">{settings.daily_calories_goal}</p>
                  <p className="text-xs text-muted-foreground">{t('bf_kcal')}/{t('nc_day')}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{t('bf_proteins')}</p>
                    <p className="text-sm font-bold tabular-nums">{settings.protein_goal || 0}{t('bf_g')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{t('bf_carbs')}</p>
                    <p className="text-sm font-bold tabular-nums">{settings.carbs_goal || 0}{t('bf_g')}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground">{t('bf_lipids')}</p>
                    <p className="text-sm font-bold tabular-nums">{settings.lipids_goal || 0}{t('bf_g')}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('nc_no_plan')}</p>
            )}
          </button>

          {/* Corpo */}
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('ath_tab_body')}</h2>
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{t('bf_height')}</p>
                <div className="flex items-center gap-2">
                  <Ruler size={16} className="shrink-0 text-muted-foreground" />
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
                <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">{t('bf_peso')}</p>
                <div className="flex items-center gap-2">
                  <Scale size={16} className="shrink-0 text-muted-foreground" />
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
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingDown size={14} className={weightTrend > 0 ? 'rotate-180' : ''} />
                <span>{weightTrend > 0 ? '+' : ''}{weightTrend.toFixed(1)} {t('bf_kg')} {t('bf_trend')}</span>
              </div>
            )}
            <button
              onClick={handleBodySave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              <Plus size={16} /> {saving ? t('salvataggio') : t('salva')}
            </button>
          </div>
        </div>
      )}

      {tab === 'sleep' && (
        <div>
          {/* Quanto hai dormito, grande */}
          <div data-tour="bf-sleep" className="relative mb-3 overflow-hidden rounded-3xl border border-border bg-card p-5">
            <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: '#a855f7' }} />
            <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"><Moon size={13} style={{ color: '#a855f7' }} /> {t('bfn_slept')}</p>
            <div className="mt-1.5 flex items-baseline gap-3">
              <span className="titanium-text text-6xl font-extrabold leading-none tabular-nums">
                {Math.floor(sleepTotalMin / 60)}h {String(sleepTotalMin % 60).padStart(2, '0')}
              </span>
              {sleepRating > 0 && <span className="rounded-full px-2 py-0.5 text-sm font-semibold" style={{ color: '#c084fc', backgroundColor: '#a855f722' }}>{sleepRating}/5</span>}
            </div>
            {napMin > 0 && (
              <p className="mt-2 text-xs text-muted-foreground">{t('bfn_incl_naps').replace('{m}', String(napMin))}</p>
            )}
          </div>

          {/* Notte */}
          <div className="mb-4 rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <Moon size={16} style={{ color: '#a855f7' }} />
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('bfn_night')}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t('bf_sleep_bedtime')}</p>
                <input
                  type="time"
                  value={sleepBedtime}
                  onChange={(e) => handleSleepChange(e.target.value, sleepWakeTime)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground">{t('bf_sleep_wake')}</p>
                <input
                  type="time"
                  value={sleepWakeTime}
                  onChange={(e) => handleSleepChange(sleepBedtime, e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
            </div>
            {sleepAuto && <p className="mt-2 text-[11px] text-muted-foreground">{t('bf_sleep_auto')}</p>}
            {(sleepHours > 0 || sleepMinutes > 0) && (
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{t('bf_sleep_duration')}</p>
                <p className="text-sm font-semibold tabular-nums">{sleepHours}h {sleepMinutes}m</p>
              </div>
            )}
          </div>

          <NapsCard naps={naps} onChange={handleNapsChange} />

          <SleepDebtTracker />

          {sleepChartData.length >= 1 && (
            <div className="mb-4 rounded-2xl border border-border bg-card p-4">
              <p className="mb-3 text-xs font-semibold">{t('bf_andamento_sleep')}</p>
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
        </div>
      )}

      {/* Storico: chiuso finche' non lo apri */}
      <button
        onClick={() => setHistoryOpen((o) => !o)}
        className="mb-3 mt-9 flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
      >
        <span>{t('storico')}{sorted.length > 0 ? ` (${sorted.length})` : ''}</span>
        <ChevronDown size={16} className={historyOpen ? 'rotate-180' : ''} />
      </button>
      {!historyOpen ? null : sorted.length === 0 ? (
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
                        const rating = entrySleepRating({ ...editEntry, sleep_hours: hours, sleep_minutes: minutes });
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
                        const rating = entrySleepRating({ ...editEntry, sleep_hours: hours, sleep_minutes: minutes });
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
      <HealthSources className="mb-4" />
      <FocusyAssistant hideTrigger open={focusyOpen} onOpenChange={handleFocusyChange} />
      <CalorieCalculator open={showCalculator} onClose={() => setShowCalculator(false)} />
      <TutorialDialog pageId="bodyfuel" />
    </div>
  );
}

export default function BodyFuel() {
  const sub = useSubscription();
  return (
    <LockedPreview locked={!sub.canUseProfiles} tier="premium" descKey="gate_personal_desc">
      <BodyFuelInner />
    </LockedPreview>
  );
}
