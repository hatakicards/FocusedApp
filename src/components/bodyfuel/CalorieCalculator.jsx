import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Calculator, AlertTriangle, User, Activity, Target, TrendingDown, TrendingUp, Scale, Heart, Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';
import { useUserSettings, useOptimisticSettingsUpdate, useBodyFuelEntries, useGymSessions } from '@/lib/useAppData';
import { calculateNutritionPlan, getAgeFromBirthDate, LIFESTYLE_LEVELS } from '@/lib/nutritionCalc';
import { base44 } from '@/api/base44Client';
import { buildGymSummary } from '@/lib/gymContext';

const LIFESTYLE_SCHEMA = {
  type: 'object',
  properties: {
    lifestyle: { type: 'string', enum: ['sedentary', 'light', 'moderate', 'active', 'athlete'] },
    confidence: { type: 'string', enum: ['high', 'low'] },
    reasoning: { type: 'string', description: 'Una frase breve in italiano che spiega la stima' },
  },
  required: ['lifestyle', 'confidence', 'reasoning'],
};

export default function CalorieCalculator({ open, onClose }) {
  const t = useT();
  const { data: settings } = useUserSettings();
  const { data: entries } = useBodyFuelEntries();
  const { data: gymSessions } = useGymSessions();
  const optimisticSettingsUpdate = useOptimisticSettingsUpdate();

  // Pre-fill from latest entry
  const latestEntry = useMemo(() => {
    if (!entries?.length) return null;
    return [...entries].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [entries]);

  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [lifestyle, setLifestyle] = useState('');
  const [goal, setGoal] = useState('');
  const [intensity, setIntensity] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const [lifestyleMode, setLifestyleMode] = useState('auto');
  const [focusySuggestion, setFocusySuggestion] = useState(null);
  const [focusyLoading, setFocusyLoading] = useState(false);
  const [focusyFailed, setFocusyFailed] = useState(false);
  const [suggestionConfirmed, setSuggestionConfirmed] = useState(false);
  const inferredForOpenRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    setSex(settings?.biological_sex || '');
    const calculatedAge = getAgeFromBirthDate(settings?.birth_date);
    setAge(calculatedAge ? String(calculatedAge) : '');
    setWeight(latestEntry?.weight?.toString() || '');
    setHeight(latestEntry?.height?.toString() || '');
    setLifestyle(settings?.lifestyle_level || '');
    setGoal(settings?.fitness_goal || '');
    setIntensity(settings?.goal_intensity || '');
    setResult(null);
  }, [open, settings, latestEntry]);

  // Stato del suggerimento Focusy: va resettato solo alla vera apertura/chiusura
  // del dialog, non ad ogni refetch di `settings` (altrimenti un refetch in
  // background mentre il dialog e' aperto cancellerebbe la stima gia' mostrata).
  useEffect(() => {
    if (!open) return;
    setLifestyleMode('auto');
    setFocusySuggestion(null);
    setFocusyFailed(false);
    setSuggestionConfirmed(false);
  }, [open]);

  const inferLifestyle = useCallback(async () => {
    setFocusyLoading(true);
    setFocusyFailed(false);
    try {
      const gymSummary = buildGymSummary(gymSessions);
      const prompt = `Analizza la scheda di allenamento dell'utente e stima il suo stile di vita/livello di attività fisica, da usare per calcolare il fabbisogno calorico giornaliero.

SCHEDA DI ALLENAMENTO:
${gymSummary || 'Nessuna scheda di allenamento impostata.'}

CONTESTO AGGIUNTIVO:
- Obiettivo fitness dichiarato: ${settings?.fitness_goal || 'non impostato'}
- Profilo utente: ${settings?.profile_type || 'base'}

LIVELLI DISPONIBILI:
- sedentary: sedentario, poco o nessun movimento
- light: sport leggero 1-3 giorni/settimana
- moderate: allenamenti regolari, sport medio 3-5 giorni/settimana
- active: allenamenti intensi, sport pesante 6-7 giorni/settimana
- athlete: atleta professionista, o lavoro fisico duro più allenamento extra

Ogni utente descrive i propri esercizi con terminologia libera (abbreviazioni, gergo personale, note sparse) — interpretala in modo flessibile, non aspettarti un formato standard. Restituisci SEMPRE una stima, mai un rifiuto: se i dati sono assenti o troppo vaghi per essere sicuro, scegli comunque il livello più plausibile e imposta confidence:"low", spiegando brevemente il motivo in "reasoning" (una frase breve in italiano). Se la scheda è chiara e regolare, usa confidence:"high".`;

      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gpt_5_4',
        response_json_schema: LIFESTYLE_SCHEMA,
      });

      if (res?.lifestyle) {
        setFocusySuggestion(res);
        setLifestyle(res.lifestyle);
      } else {
        setFocusyFailed(true);
      }
    } catch (e) {
      console.error('inferLifestyle error', e);
      setFocusyFailed(true);
    } finally {
      setFocusyLoading(false);
    }
  }, [gymSessions, settings]);

  useEffect(() => {
    if (!open) {
      inferredForOpenRef.current = false;
      return;
    }
    if (inferredForOpenRef.current) return;
    inferredForOpenRef.current = true;
    inferLifestyle();
  }, [open, inferLifestyle]);

  const canCalculate = sex && age && weight && height && lifestyle && goal && (goal === 'maintain' || goal === 'personalized' || intensity);

  const handleCalculate = () => {
    if (!canCalculate) return;
    const plan = calculateNutritionPlan({
      sex,
      age: parseInt(age),
      weightKg: parseFloat(weight),
      heightCm: parseFloat(height),
      lifestyleLevel: lifestyle,
      goal,
      intensity,
    });
    setResult(plan);
  };

  const handleSave = async () => {
    if (!result || !settings) return;
    setSaving(true);
    try {
      await optimisticSettingsUpdate(settings.id, {
        biological_sex: sex,
        lifestyle_level: lifestyle,
        fitness_goal: goal,
        goal_intensity: goal === 'lose' || goal === 'gain' ? intensity : null,
        daily_calories_goal: result.targetCalories || 0,
        protein_goal: result.protein || 0,
        carbs_goal: result.carbs || 0,
        lipids_goal: result.fat || 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const bmiCategoryLabel = (catId) => {
    const map = {
      underweight: t('nc_bmi_underweight'),
      normal: t('nc_bmi_normal'),
      overweight: t('nc_bmi_overweight'),
      obese1: t('nc_bmi_obese1'),
      obese2: t('nc_bmi_obese2'),
      obese3: t('nc_bmi_obese3'),
    };
    return map[catId] || '';
  };

  const bmiCategoryColor = (catId) => {
    if (catId === 'underweight') return '#f59e0b';
    if (catId === 'normal') return '#10b981';
    if (catId === 'overweight') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator size={18} /> {t('nc_title')}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-1">
            {/* Sex */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><User size={12} /> {t('nc_sex')}</p>
              <div className="grid grid-cols-2 gap-2">
                {['male', 'female'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSex(s)}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${sex === s ? 'border-foreground bg-foreground text-background' : 'border-border bg-background'}`}
                  >
                    {t('nc_' + s)}
                  </button>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t('nc_age')}</p>
              <input
                type="number"
                inputMode="numeric"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder={t('nc_age_ph')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>

            {/* Weight + Height */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Scale size={12} /> {t('nc_weight')}</p>
                <input
                  type="number"
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder={t('nc_weight_ph')}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('nc_height')}</p>
                <input
                  type="number"
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder={t('nc_height_ph')}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Lifestyle */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Activity size={12} /> {t('nc_lifestyle')}</p>

              {lifestyleMode === 'auto' && !focusyFailed ? (
                <>
                  {focusyLoading && (
                    <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground">
                      <Loader2 size={14} className="animate-spin shrink-0" /> {t('nc_focusy_analyzing')}
                    </div>
                  )}

                  {!focusyLoading && focusySuggestion && (focusySuggestion.confidence === 'high' || suggestionConfirmed) && (
                    <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-3">
                      <p className="text-sm flex items-start gap-2">
                        <Sparkles size={14} className="shrink-0 mt-0.5" />
                        <span>{t('nc_focusy_says')} <strong>{t('nc_life_' + focusySuggestion.lifestyle)}</strong></span>
                      </p>
                      <button
                        type="button"
                        onClick={() => setLifestyleMode('manual')}
                        className="mt-2 text-xs font-medium text-muted-foreground underline"
                      >
                        {t('nc_choose_manually')}
                      </button>
                    </div>
                  )}

                  {!focusyLoading && focusySuggestion && focusySuggestion.confidence === 'low' && !suggestionConfirmed && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2.5">
                      <p className="text-sm flex items-start gap-2">
                        <Sparkles size={14} className="shrink-0 mt-0.5" />
                        <span>
                          {t('nc_focusy_unsure')} <strong>{t('nc_life_' + focusySuggestion.lifestyle)}</strong>
                          {focusySuggestion.reasoning ? ` — ${focusySuggestion.reasoning}` : ''}
                        </span>
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSuggestionConfirmed(true)}
                          className="flex-1 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background"
                        >
                          {t('nc_focusy_confirm')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setLifestyleMode('manual')}
                          className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                        >
                          {t('nc_focusy_correct')}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {focusySuggestion && (
                    <button
                      type="button"
                      onClick={() => setLifestyleMode('auto')}
                      className="mb-2 text-xs font-medium text-muted-foreground underline"
                    >
                      {t('nc_back_to_focusy')}
                    </button>
                  )}
                  <div className="space-y-1.5">
                    {LIFESTYLE_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setLifestyle(lvl.id)}
                        className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition-colors ${lifestyle === lvl.id ? 'border-foreground bg-foreground/5' : 'border-border bg-background'}`}
                      >
                        {t('nc_life_' + lvl.id)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Goal */}
            <div>
              <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5"><Target size={12} /> {t('nc_goal')}</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'lose', icon: TrendingDown },
                  { id: 'gain', icon: TrendingUp },
                  { id: 'maintain', icon: Heart },
                  { id: 'personalized', icon: Scale },
                ].map((g) => {
                  const Icon = g.icon;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setGoal(g.id)}
                      className={`flex items-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${goal === g.id ? 'border-foreground bg-foreground/5' : 'border-border bg-background'}`}
                    >
                      <Icon size={14} /> {t('nc_goal_' + g.id)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Intensity (only for lose/gain) */}
            {(goal === 'lose' || goal === 'gain') && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">{t('nc_intensity')}</p>
                <div className="grid grid-cols-3 gap-2">
                  {['light', 'intense', 'drastic'].map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIntensity(i)}
                      className={`rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors ${intensity === i ? 'border-foreground bg-foreground/5' : 'border-border bg-background'}`}
                    >
                      {t('nc_int_' + i)}
                    </button>
                  ))}
                </div>
                {intensity === 'drastic' && (
                  <div className="mt-2 flex items-start gap-2 rounded-xl bg-orange-500/10 p-2.5">
                    <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-muted-foreground">{t('nc_drastic_warn')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Medical disclaimer */}
            <div className="flex items-start gap-2 rounded-xl bg-muted p-3">
              <AlertTriangle size={14} className="text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground">{t('nc_medical_disclaimer')}</p>
            </div>

            <button
              type="button"
              onClick={handleCalculate}
              disabled={!canCalculate}
              className="w-full rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              {t('nc_calculate')}
            </button>
          </div>
        ) : (
          <div className="space-y-4 py-1">
            {/* BMI */}
            <div className="rounded-xl border border-border bg-background p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('nc_bmi')}</p>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tabular-nums">{result.bmi}</p>
                <p className="text-sm font-medium" style={{ color: bmiCategoryColor(result.bmiCategory) }}>
                  {bmiCategoryLabel(result.bmiCategory)}
                </p>
              </div>
              {/* BMI scale */}
              <div className="mt-3 flex h-2 rounded-full overflow-hidden">
                <div className="flex-1 bg-yellow-500/60" />
                <div className="flex-1 bg-emerald-500/60" />
                <div className="flex-1 bg-yellow-500/60" />
                <div className="flex-1 bg-orange-500/60" />
                <div className="flex-1 bg-red-500/60" />
              </div>
              <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
                <span>18.5</span><span>25</span><span>30</span><span>35</span><span>40</span>
              </div>
            </div>

            {/* BMR + TDEE */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground mb-1">{t('nc_bmr')}</p>
                <p className="text-2xl font-bold tabular-nums">{result.bmr}</p>
                <p className="text-[10px] text-muted-foreground">{t('bf_kcal')}/{t('nc_day')}</p>
              </div>
              <div className="rounded-xl border border-border bg-background p-4">
                <p className="text-xs text-muted-foreground mb-1">{t('nc_tdee')}</p>
                <p className="text-2xl font-bold tabular-nums">{result.tdee}</p>
                <p className="text-[10px] text-muted-foreground">{t('bf_kcal')}/{t('nc_day')}</p>
              </div>
            </div>

            {/* Target Calories */}
            <div className="rounded-xl border border-foreground/20 bg-foreground/5 p-4">
              <p className="text-xs text-muted-foreground mb-1">{t('nc_target_cal')}</p>
              <p className="text-3xl font-bold tabular-nums">{result.targetCalories} <span className="text-base font-normal text-muted-foreground">{t('bf_kcal')}</span></p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {goal === 'lose' && t('nc_goal_lose_desc')}
                {goal === 'gain' && t('nc_goal_gain_desc')}
                {goal === 'maintain' && t('nc_goal_maintain_desc')}
                {goal === 'personalized' && t('nc_goal_personalized_desc')}
              </p>
            </div>

            {/* Macros */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">{t('nc_daily_macros')}</p>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-background p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{t('bf_proteins')}</p>
                  <p className="text-xl font-bold text-blue-400 tabular-nums">{result.protein}</p>
                  <p className="text-[10px] text-muted-foreground">{t('bf_g')}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{t('bf_carbs')}</p>
                  <p className="text-xl font-bold text-amber-400 tabular-nums">{result.carbs}</p>
                  <p className="text-[10px] text-muted-foreground">{t('bf_g')}</p>
                </div>
                <div className="rounded-xl border border-border bg-background p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{t('bf_lipids')}</p>
                  <p className="text-xl font-bold text-purple-400 tabular-nums">{result.fat}</p>
                  <p className="text-[10px] text-muted-foreground">{t('bf_g')}</p>
                </div>
              </div>
            </div>

            {/* Formula used */}
            <p className="text-[11px] text-muted-foreground/70 text-center">
              {result.bmiCategory === 'overweight' || result.bmiCategory?.startsWith('obese')
                ? t('nc_formula_mifflin')
                : t('nc_formula_harris')}
            </p>

            {/* Medical disclaimer for extreme cases */}
            {(result.bmiCategory === 'underweight' || result.bmiCategory?.startsWith('obese')) && (
              <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 p-3">
                <AlertTriangle size={14} className="text-orange-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground">{t('nc_extreme_warn')}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setResult(null)}
                className="flex-1 rounded-xl border border-border px-4 py-2.5 text-sm font-medium"
              >
                {t('nc_back')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
              >
                {saving ? t('salvataggio') : t('nc_save_plan')}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}