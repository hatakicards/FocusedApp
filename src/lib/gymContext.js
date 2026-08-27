// Riepilogo testuale della scheda di allenamento (GymSession[]) per i prompt
// LLM di Focusy — sia la chat libera (FocusyAssistant) sia l'inferenza dello
// stile di vita nel calcolatore calorico (CalorieCalculator) usano lo stesso
// formato, cosi' la stima resta coerente con quanto Focusy racconta in chat.
export function buildGymSummary(gymSessions) {
  const withExercises = (gymSessions || []).filter((s) => (s.exercises || []).length > 0);
  if (!withExercises.length) return null;
  return withExercises
    .map((s) => {
      const exList = s.exercises.map((e) => `${e.name}${e.info ? ` (${e.info})` : ''}`).join(', ');
      return `  - ${s.day_of_week}${s.title ? ` — ${s.title}` : ''}: ${exList}`;
    })
    .join('\n');
}
