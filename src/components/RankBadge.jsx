import { Image } from '@/components/ui/image';
import { RANKS } from '@/lib/constants';
import { cn } from '@/lib/utils';

export default function RankBadge({ rankId, size = 'md', showName = true }) {
  const rank = RANKS.find((r) => r.id === rankId);
  if (!rank) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs" style={{ width: size === 'lg' ? 80 : size === 'md' ? 56 : 40, height: size === 'lg' ? 80 : size === 'md' ? 56 : 40 }}>
          —
        </div>
        {showName && <span className="text-xs text-muted-foreground">Nessun rank</span>}
      </div>
    );
  }

  const dims = size === 'lg' ? 80 : size === 'md' ? 56 : 40;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative rounded-full overflow-hidden" style={{ width: dims, height: dims }}>
        <Image
          src={rank.image}
          alt={rank.name}
          fittingType="fit"
          className="w-full h-full object-contain"
        />
      </div>
      {showName && (
        <span className={cn('font-medium tracking-tight', size === 'lg' ? 'text-base' : 'text-xs')}>
          {rank.name}
        </span>
      )}
    </div>
  );
}