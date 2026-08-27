import { useState } from 'react';
import { ACTIVITY_ICONS } from '@/lib/constants';
import { getActivityIcon } from '@/components/ActivityIcon';
import { useT } from '@/lib/i18n';

export default function EmojiPicker({ value, onChange }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const CurrentIcon = getActivityIcon(value);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground/10">
          <CurrentIcon size={18} className="text-foreground" />
        </span>
        <span className={`text-sm ${value ? 'text-foreground' : 'text-muted-foreground'}`}>
          {value || t('af_emoji_ph')}
        </span>
      </button>
      {open && (
        <div className="grid grid-cols-8 gap-1.5 rounded-xl border border-border bg-card p-3">
          {ACTIVITY_ICONS.map((iconName) => {
            const Icon = getActivityIcon(iconName);
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => {
                  onChange(iconName);
                  setOpen(false);
                }}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  value === iconName ? 'bg-foreground/15 ring-1 ring-foreground' : 'hover:bg-accent'
                }`}
              >
                <Icon size={20} className="text-foreground" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}