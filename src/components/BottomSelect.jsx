import { useState, useContext } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from '@/components/ui/drawer';
import { InsideOverlayContext } from '@/components/ui/overlay-context';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';

const TRIGGER_CLASS = 'flex w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm';

export default function BottomSelect({ value, onValueChange, options, placeholder, label }) {
  const t = useT();
  const insideOverlay = useContext(InsideOverlayContext);
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const ph = placeholder || t('bs_seleziona_ph');
  const lbl = label || t('bs_seleziona_ph');

  const optionButtons = options.map((option) => (
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
  ));

  // Dentro un Dialog/Drawer la lista si apre in linea sotto il campo: un secondo
  // pannello in portale sopra a un overlay modale non e' affidabile su iOS
  // (tap letti come "fuori" dall'overlay padre, che si chiude senza applicare la scelta).
  if (insideOverlay) {
    return (
      <div>
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className={TRIGGER_CLASS}>
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? selected.label : ph}
          </span>
          <ChevronDown size={16} className={cn('opacity-50 transition-transform', open && 'rotate-180')} />
        </button>
        {open && (
          <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-md border border-input bg-background p-1">
            {optionButtons}
          </div>
        )}
      </div>
    );
  }

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button type="button" className={TRIGGER_CLASS}>
          <span className={cn(!selected && 'text-muted-foreground')}>
            {selected ? selected.label : ph}
          </span>
          <ChevronDown size={16} className="opacity-50" />
        </button>
      </DrawerTrigger>
      <DrawerContent className="max-h-[60vh]">
        <DrawerTitle className="px-4 pb-2 text-sm font-semibold">{lbl}</DrawerTitle>
        <div className="overflow-y-auto px-2 pb-20 space-y-1">{optionButtons}</div>
      </DrawerContent>
    </Drawer>
  );
}
