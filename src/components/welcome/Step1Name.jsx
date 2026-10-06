import { useState } from 'react';
import { ArrowRight, Info, X } from 'lucide-react';

export default function Step1Name({ data, onNext }) {
  const [name, setName] = useState(data.name || '');
  const [birthDate, setBirthDate] = useState(data.birthDate || '');
  const [showWhy, setShowWhy] = useState(false);

  const canContinue = name.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    onNext({ name: name.trim(), birthDate });
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Let's get to know you</h1>
        <p className="text-muted-foreground text-sm mb-8">Tell us a bit about yourself.</p>

        <div className="space-y-5">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Your name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              autoFocus
              className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-foreground text-base font-medium outline-none focus:border-foreground/50 transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Date of birth (optional)</label>
              <button
                type="button"
                onClick={() => setShowWhy(true)}
                className="text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Why we ask for this"
              >
                <Info size={14} />
              </button>
            </div>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-foreground text-base font-medium outline-none focus:border-foreground/50 transition-colors [color-scheme:dark]"
            />
          </div>
        </div>
      </div>

      <button
        onClick={handleContinue}
        disabled={!canContinue}
        className="w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity mt-8"
      >
        Continue <ArrowRight size={18} />
      </button>

      {showWhy && (
        <div
          className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-md flex items-center justify-center p-6"
          onClick={() => setShowWhy(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-border bg-card p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold">Why we ask for your date of birth</h3>
              <button onClick={() => setShowWhy(false)} className="rounded-full p-1 hover:bg-muted">
                <X size={18} />
              </button>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• To unlock the "Quit Smoking" activity, which contains health content only appropriate for adults.</li>
              <li>• To let our AI assistant create a sleep, nutrition and activity plan tailored precisely to your age.</li>
            </ul>
            <p className="text-xs text-muted-foreground/70 mt-3">
              It's optional — without it, age-restricted content stays locked and AI plans will be more generic.
            </p>
            <button
              onClick={() => setShowWhy(false)}
              className="w-full mt-4 rounded-xl bg-foreground py-3 text-sm font-bold text-background"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}