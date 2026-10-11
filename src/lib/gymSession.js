// Un esercizio della scheda: { name, info, mode: 'reps' | 'time', reps, duration (secondi), weight (kg), sets }.
// Gli esercizi salvati prima della 1.1 hanno solo { name, info }: valgono come "ripetizioni", 1 serie.

export function normalizeExercise(ex) {
  return {
    name: ex?.name || '',
    info: ex?.info || '',
    mode: ex?.mode === 'time' ? 'time' : 'reps',
    reps: ex?.reps ?? '',
    duration: ex?.duration ?? '',
    weight: ex?.weight ?? '',
    sets: ex?.sets ?? '',
  };
}

export function setsOf(ex) {
  return Math.max(1, parseInt(ex?.sets, 10) || 1);
}

export function toPositiveInt(v) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 0 ? n : '';
}

export function toPositiveNumber(v) {
  const n = parseFloat(String(v).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : '';
}

export function fmtClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  return `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

// Passi della sessione guidata: riscaldamento, poi per ogni esercizio serie + recupero.
// Il recupero segue ogni serie tranne l'ultima in assoluto (poi c'e' il finale).
export function buildSessionSteps(exercises) {
  const list = (exercises || []).filter((e) => e?.name?.trim()).map(normalizeExercise);
  const steps = [{ type: 'warmup' }];
  list.forEach((ex, exIdx) => {
    const total = setsOf(ex);
    for (let setNo = 1; setNo <= total; setNo += 1) {
      steps.push({ type: 'work', exIdx, setNo, totalSets: total });
      const isLast = exIdx === list.length - 1 && setNo === total;
      if (!isLast) steps.push({ type: 'rest', exIdx, setNo, totalSets: total });
    }
  });
  return { exercises: list, steps };
}

// Riepilogo compatto di un esercizio ("3 × 10 · 20 kg"), senza parole localizzate
// cosi' vale sia per l'interfaccia sia per il contesto di Focusy. Con `verbose`
// aggiunge le unita' in chiaro ("reps", "sec") per l'LLM.
export function describeExercise(ex, { verbose = false } = {}) {
  const e = normalizeExercise(ex);
  const sets = setsOf(e);
  let load = `${sets}`;
  if (e.mode === 'time' && e.duration) load = `${sets} × ${e.duration}${verbose ? ' sec' : 's'}`;
  else if (e.mode === 'reps' && e.reps) load = `${sets} × ${e.reps}${verbose ? ' reps' : ''}`;
  else if (verbose) load = `${sets} sets`;
  const weight = e.weight ? ` · ${e.weight} kg` : '';
  return `${load}${weight}`;
}
