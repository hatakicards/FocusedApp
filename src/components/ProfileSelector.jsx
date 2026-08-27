import { PROFILE_TYPES } from '@/lib/constants';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Image } from '@/components/ui/image';
import { Lock, Dumbbell, GraduationCap, Briefcase } from 'lucide-react';

const PROFILE_ICONS = {
  atleta: Dumbbell,
  studente: GraduationCap,
  professionista: Briefcase,
};

export default function ProfileSelector({ value, onChange, compact = false, lockedProfiles = [], onLockedClick }) {
  const t = useT();
  const [base, ...rest] = PROFILE_TYPES;

  const renderCard = (p, variant) => {
    const selected = value === p.id;
    const locked = lockedProfiles.includes(p.id);
    const Icon = PROFILE_ICONS[p.id];
    const isBase = p.id === 'base';

    return (
      <button
        key={p.id}
        type="button"
        onClick={() => (locked ? onLockedClick?.() : onChange(p.id))}
        className={cn(
          'relative flex rounded-2xl border p-4 text-left transition-all',
          variant === 'wide' ? 'flex-row items-center gap-4' : 'flex-col items-center gap-2 text-center',
          selected
            ? 'border-foreground bg-foreground/5'
            : 'border-border bg-card hover:bg-accent/30',
          locked && 'opacity-60'
        )}
      >
        <span
          className={cn(
            'flex shrink-0 items-center justify-center rounded-xl overflow-hidden bg-black',
            variant === 'wide' ? 'h-14 w-14' : 'h-12 w-12'
          )}
          style={selected && p.color ? { boxShadow: `inset 0 0 0 1px ${p.color}50` } : {}}
        >
          {isBase && p.image ? (
            <Image src={p.image} alt={p.id} fittingType="fit" className="blend-screen w-full h-full object-contain" />
          ) : Icon ? (
            <Icon size={variant === 'wide' ? 26 : 22} className="text-foreground" strokeWidth={1.75} />
          ) : null}
        </span>
        <div className={cn('min-w-0', variant === 'wide' ? 'flex-1' : 'w-full')}>
          <p className={cn('font-semibold flex items-center gap-1', variant === 'wide' ? 'text-sm' : 'text-xs justify-center')}>
            {t('profile_' + p.id)}
            {locked && <Lock size={12} className="text-muted-foreground" />}
          </p>
          <p className={cn('text-muted-foreground mt-0.5', variant === 'wide' ? 'text-xs' : 'text-[10px]')}>
            {t('profile_' + p.id + '_desc')}
          </p>
        </div>
        {selected && (
          <span
            className={cn(
              'h-3 w-3 shrink-0 rounded-full',
              variant === 'wide' ? '' : 'absolute top-3 right-3'
            )}
            style={{ backgroundColor: p.color }}
          />
        )}
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {renderCard(base, 'wide')}
      <div className="grid grid-cols-3 gap-3">
        {rest.map((p) => renderCard(p, 'compact'))}
      </div>
    </div>
  );
}