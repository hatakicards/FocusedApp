import { CircleHelp } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { TUTORIALS } from '@/lib/tutorials';

// "?" in cima a ogni sezione: riapre la spiegazione di quella pagina (TutorialDialog) quando si vuole.
export const OPEN_TUTORIAL_EVENT = 'open-tutorial';
export const REPLAY_FIRST_RUN_EVENT = 'replay-first-run';

export default function HelpButton({ pageId, className = '', light = false }) {
  const t = useT();
  if (!TUTORIALS[pageId]) return null;
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_TUTORIAL_EVENT, { detail: { pageId } }))}
      aria-label={t('help_btn')}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border active:scale-95 ${light ? 'border-white/30 bg-black/30 text-white' : 'border-border text-muted-foreground'} ${className}`}
    >
      <CircleHelp size={18} strokeWidth={1.7} />
    </button>
  );
}
