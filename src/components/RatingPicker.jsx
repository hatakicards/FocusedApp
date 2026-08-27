import { cn } from '@/lib/utils';
import { RATING_COLORS } from '@/lib/constants';
import { useT } from '@/lib/i18n';

const SIZES = {
  sm: 'h-9 w-9 text-sm',
  md: 'h-11 w-11 text-base',
  lg: 'h-12 w-12 text-lg',
};

export default function RatingPicker({ value, onChange, size = 'md', disabled = false }) {
  const t = useT();
  return (
    <div className="flex gap-2.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const isSelected = value === n;
        const color = RATING_COLORS[n];
        return (
          <button
            key={n}
            type="button"
            disabled={disabled}
            onClick={() => onChange?.(n)}
            className={cn(
              'flex items-center justify-center rounded-full font-bold transition-all duration-150 active:scale-90 select-none',
              SIZES[size],
              isSelected
                ? 'scale-110 shadow-lg'
                : 'bg-muted text-muted-foreground hover:bg-accent',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={isSelected ? { backgroundColor: color, color: '#fff' } : undefined}
            title={t('rating_' + n)}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}