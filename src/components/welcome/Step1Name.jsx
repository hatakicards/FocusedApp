import { useState } from 'react';
import { ArrowRight } from 'lucide-react';

export default function Step1Name({ data, onNext }) {
  const [name, setName] = useState(data.name || '');
  const [birthDate, setBirthDate] = useState(data.birthDate || '');

  const canContinue = name.trim().length > 0 && birthDate.length > 0;

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
            <label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Date of birth</label>
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
    </div>
  );
}