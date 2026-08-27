import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useT } from '@/lib/i18n';

export default function CustomFoodDialog({ open, onClose, onSave }) {
  const t = useT();
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [lipids, setLipids] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName('');
      setKcal('');
      setProtein('');
      setCarbs('');
      setLipids('');
    }
  }, [open]);

  const handleSave = async () => {
    if (!name.trim() || !kcal) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        kcal: parseFloat(kcal) || 0,
        protein: parseFloat(protein) || 0,
        carbs: parseFloat(carbs) || 0,
        lipids: parseFloat(lipids) || 0,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('bf_custom_food')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">{t('bf_food_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('bf_food_name_ph')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t('bf_per_100g')}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('bf_calories')}</label>
              <input
                type="number"
                inputMode="decimal"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('bf_proteins')}</label>
              <input
                type="number"
                inputMode="decimal"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('bf_carbs')}</label>
              <input
                type="number"
                inputMode="decimal"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t('bf_lipids')}</label>
              <input
                type="number"
                inputMode="decimal"
                value={lipids}
                onChange={(e) => setLipids(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('annulla')}</Button>
          <Button onClick={handleSave} disabled={!name.trim() || !kcal || saving}>
            {saving ? t('salvataggio') : t('salva')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}