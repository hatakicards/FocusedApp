import { useEffect } from 'react';
import { startPlanWelcome } from '@/lib/planWelcome';

// Dopo un acquisto o un codice: fa partire il benvenuto al piano (lucchetto che si apre e giro guidato,
// vedi planwelcome/PlanWelcomeFlow, montato in AppLayout) e chiude subito, cosi' chi lo usa puo'
// proseguire (es. andare in Oggi) mentre il benvenuto resta sopra.
export default function WelcomeToProAnimation({ tier, onClose }) {
  useEffect(() => {
    if (!tier) return;
    startPlanWelcome(tier);
    onClose?.();
  }, [tier]);
  return null;
}
