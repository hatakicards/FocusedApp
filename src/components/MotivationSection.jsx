import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { MOTIVATION_QUOTES } from '@/lib/motivationQuotes';
import { useT, useI18n } from '@/lib/i18n';

const LEVELS = ['base', 'strong', 'brutal'];
const LEVEL_LABELS = { base: 'BASE', strong: 'STRONG', brutal: 'BRUTAL' };

export default function MotivationSection({ profileType }) {
  const t = useT();
  const { lang } = useI18n();
  const [level, setLevel] = useState(() => localStorage.getItem('motiv_level') || 'base');
  const [index, setIndex] = useState(() => parseInt(localStorage.getItem('motiv_index') || '0'));

  const langQuotes = MOTIVATION_QUOTES[lang] || MOTIVATION_QUOTES.it;
  const quotes = langQuotes[profileType]?.[level] || langQuotes.base[level] || [];
  const currentQuote = quotes[index % quotes.length] || quotes[0] || '';

  useEffect(() => { localStorage.setItem('motiv_level', level); }, [level]);
  useEffect(() => { localStorage.setItem('motiv_index', String(index)); }, [index]);

  const changeLevel = (l) => { setLevel(l); setIndex(0); };
  const prev = () => setIndex((i) => (i - 1 + quotes.length) % quotes.length);
  const next = () => setIndex((i) => (i + 1) % quotes.length);

  if (quotes.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Zap size={16} className="text-foreground" />
        <h3 className="text-sm font-semibold">{t('motivation_title')}</h3>
      </div>

      <div className="flex gap-2 mb-3">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => changeLevel(l)}
            className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold tracking-wider transition-colors ${
              level === l ? 'bg-foreground text-background' : 'bg-background text-muted-foreground border border-border'
            }`}
          >
            {LEVEL_LABELS[l]}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <button onClick={prev} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform">
          <ChevronLeft size={18} />
        </button>
        <p className="flex-1 text-xs text-foreground leading-relaxed text-center italic min-h-[3rem] flex items-center justify-center px-1">
          {currentQuote}
        </p>
        <button onClick={next} className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:text-foreground active:scale-90 transition-transform">
          <ChevronRight size={18} />
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        {(index % quotes.length) + 1} / {quotes.length}
      </p>
    </div>
  );
}