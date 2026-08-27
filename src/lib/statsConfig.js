import { Dumbbell, Brain, ShieldCheck, Users, Smile, Activity } from 'lucide-react';

export const LIFE_STATS = [
  { id: 'forza', name: 'Forza', icon: Dumbbell, color: '#ef4444' },
  { id: 'intelligenza', name: 'Intelligenza', icon: Brain, color: '#3b82f6' },
  { id: 'disciplina', name: 'Disciplina', icon: ShieldCheck, color: '#22c55e' },
  { id: 'relazioni', name: 'Relazioni', icon: Users, color: '#f59e0b' },
  { id: 'autostima', name: 'Autostima', icon: Smile, color: '#a855f7' },
];

// Extra stat shown only for atleta profile
export const ATLETA_STAT = { id: 'prestazione_atletica', name: 'Prestazione atletica', icon: Activity, color: '#f97316' };

export function getLifeStatsForProfile(profileType) {
  if (profileType === 'atleta') return [...LIFE_STATS, ATLETA_STAT];
  return LIFE_STATS;
}

export const defaultScores = () => ({
  forza: 50,
  intelligenza: 50,
  disciplina: 50,
  relazioni: 50,
  autostima: 50,
  prestazione_atletica: 50,
});