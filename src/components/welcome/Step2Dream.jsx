import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function Step2Dream({ data, onNext, onBack }) {
  const [dream, setDream] = useState(data.dream || '');
  const [showPact, setShowPact] = useState(false);

  useEffect(() => {
    if (dream.trim().length > 5 && !showPact) {
      const t = setTimeout(() => setShowPact(true), 400);
      return () => clearTimeout(t);
    }
  }, [dream, showPact]);

  const canContinue = dream.trim().length > 0;

  const handleContinue = () => {
    if (!canContinue) return;
    onNext({ dream: dream.trim() });
  };

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">What is your dream?</h1>
        <p className="text-muted-foreground text-sm mb-6">Write it down. Make it real.</p>

        <textarea
          value={dream}
          onChange={(e) => setDream(e.target.value)}
          placeholder="My dream is to..."
          autoFocus
          rows={5}
          className="w-full rounded-2xl border border-border bg-card px-4 py-4 text-foreground text-base font-medium outline-none focus:border-foreground/50 transition-colors resize-none"
        />

        <AnimatePresence>
          {showPact && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mt-6 rounded-2xl border border-foreground/20 bg-foreground/5 p-4 text-center"
            >
              <p className="text-sm font-semibold text-foreground leading-relaxed">
                Today you sign a pact with yourself.
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Be sure to keep your word.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex gap-3 mt-8">
        <button
          onClick={onBack}
          className="rounded-2xl border border-border px-5 py-4 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <button
          onClick={handleContinue}
          disabled={!canContinue}
          className="flex-1 rounded-2xl bg-foreground py-4 text-sm font-bold text-background flex items-center justify-center gap-2 disabled:opacity-30 transition-opacity"
        >
          Continue <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}