import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

export default function BottomSelect({ value, onValueChange, options, placeholder, label }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const ph = placeholder || t('bs_seleziona_ph');
  const lbl = label || t('bs_seleziona_ph');

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? selected.label : ph}
          </span>
          <ChevronDown size={16} className="opacity-50" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[60vh]">
        <DrawerTitle className="px-4 pb-2 text-sm font-semibold">{lbl}</DrawerTitle>
        <div className="overflow-y-auto px-2 pb-20 space-y-1">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onValueChange?.(option.value);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm transition-colors active:scale-[0.98]',
                option.value === value ? 'bg-accent' : 'hover:bg-accent/50'
              )}
            >
              <span className="flex items-center gap-2">
                {option.color && (
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: option.color }} />
                )}
                {option.label}
              </span>
              {option.value === value && <Check size={16} />}
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}