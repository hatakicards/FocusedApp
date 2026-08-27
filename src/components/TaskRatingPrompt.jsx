import { useState } from 'react';
import { X } from 'lucide-react';
import RatingPicker from '@/components/RatingPicker';
import { useT } from '@/lib/i18n';

export default function TaskRatingPrompt({ task, onClose, onRate }) {
  const t = useT();
  const [rating, setRating] = useState(0);
  const [earnings, setEarnings] = useState('');
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-[80] bg-background/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl bg-card border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{t('trp_completato')}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{t('trp_come')}</p>
        <p className="text-sm font-medium mb-6 truncate">{task.title}</p>
        <div className="flex justify-center mb-6">
          <RatingPicker value={rating} onChange={setRating} />
        </div>
        <div className="mb-6">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('trp_earnings')}</label>
          <div className="relative">
            <input
              type="number"
              min="0"
              step="0.01"
              value={earnings}
              onChange={(e) => setEarnings(e.target.value)}
              placeholder="0"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark] pr-8"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border py-3 text-sm font-semibold">
            {t('salta')}
          </button>
          <button
            onClick={() => rating && onRate({ rating, earnings: earnings ? Number(earnings) : 0 })}
            disabled={!rating}
            className="flex-1 rounded-xl bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-40"
          >
            {t('trp_salva_voto')}
          </button>
        </div>
      </div>
    </div>
  );
}