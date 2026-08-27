import { Flame } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StreakBadge({ streak, size = 'md' }) {
  if (!streak || streak === 0) return null;

  const sizes = {
    sm: { icon: 14, text: 'text-xs', gap: 'gap-1' },
    md: { icon: 16, text: 'text-sm', gap: 'gap-1.5' },
    lg: { icon: 24, text: 'text-xl', gap: 'gap-2' },
  };
  const s = sizes[size];

  return (
    <div className={cn('inline-flex items-center font-semibold text-foreground', s.gap)}>
      <Flame size={s.icon} strokeWidth={2.5} className="fill-foreground/10" />
      <span className={s.text}>{streak}</span>
    </div>
  );
}