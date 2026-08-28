import { useState, useEffect } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogPortal, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { TUTORIALS } from '@/lib/tutorials';
import { cn } from '@/lib/utils';
import { useUserSettings } from '@/lib/useAppData';

const STORAGE_PREFIX = 'tutorial_seen_';

export default function TutorialDialog({ pageId }) {
  const t = useT();
  const { data: settings } = useUserSettings();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const tutorial = TUTORIALS[pageId];

  useEffect(() => {
    if (!tutorial) return;
    const check = () => {
      try {
        const seen = localStorage.getItem(STORAGE_PREFIX + pageId);
        // Il messaggio "PROVA PREMIUM GRATUITA" (AppLayout.jsx) deve sempre
        // apparire prima del primo tutorial — se l'utente ha una prova
        // gratuita in corso e non l'ha ancora chiuso, aspettiamo.
        const waitingForTrialWelcome = settings?.trial_start && !localStorage.getItem('trial_welcome_seen');
        if (!seen && !waitingForTrialWelcome) setOpen(true);
      } catch (e) { /* ignore */ }
    };
    check();
    window.addEventListener('trial-welcome-dismissed', check);
    return () => window.removeEventListener('trial-welcome-dismissed', check);
  }, [pageId, tutorial, settings?.trial_start]);

  if (!tutorial) return null;

  const steps = tutorial.steps;
  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const close = () => {
    try { localStorage.setItem(STORAGE_PREFIX + pageId, '1'); } catch (e) { /* ignore */ }
    setOpen(false);
  };

  const next = () => {
    if (isLast) { close(); return; }
    setStep((s) => s + 1);
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogPortal>
        {/* Non-blocking overlay: pointer-events-none lets clicks pass through to the BottomNav
            so users can navigate away even while the tutorial is open. The content below
            re-enables pointer events for the dialog card itself. */}
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-50 bg-black/80 pointer-events-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg pointer-events-auto"
          )}
        >
          <button
            onClick={close}
            className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
          >
            <X size={18} />
          </button>
          <DialogHeader>
            <DialogTitle className="text-center pt-2">{t(tutorial.titleKey)}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center py-4">
            <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mb-4">
              <Icon size={32} className="text-foreground" />
            </div>
            <h3 className="text-base font-semibold text-center mb-1">{t(current.titleKey)}</h3>
            <p className="text-sm text-muted-foreground text-center px-2">{t(current.textKey)}</p>
          </div>

          <div className="flex items-center justify-center gap-1.5 mb-2">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-foreground' : 'w-1.5 bg-foreground/20'}`}
              />
            ))}
          </div>

          <DialogFooter className="flex-row items-center justify-between sm:justify-between">
            <Button variant="ghost" size="sm" onClick={close}>
              {t('tut_skip')}
            </Button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="outline" size="sm" onClick={prev}>
                  <ChevronLeft size={16} />
                </Button>
              )}
              <Button size="sm" onClick={next}>
                {isLast ? t('tut_start') : (
                  <>
                    {t('tut_next')} <ChevronRight size={16} />
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}