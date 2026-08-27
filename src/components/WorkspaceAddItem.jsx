import { useState } from 'react';
import { Users, Clock, Plus } from 'lucide-react';
import { useOptimisticTaskSave, useInvalidateAll } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function WorkspaceAddItem({ open, onClose }) {
  const t = useT();
  const optimisticSave = useOptimisticTaskSave();
  const invalidate = useInvalidateAll();
  const [itemType, setItemType] = useState('riunione');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [earnings, setEarnings] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setItemType('riunione');
    setName('');
    setDate('');
    setEarnings('');
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    if (!name.trim() || !date) return;
    setSaving(true);
    try {
      const payload = {
        title: name.trim(),
        type: itemType === 'riunione' ? 'meeting' : 'deadline',
        due_date: date,
        expected_earnings: earnings ? Number(earnings) : 0,
      };
      await optimisticSave(payload);
      invalidate();
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ws_add_item')}</DialogTitle>
        </DialogHeader>
        <div className="py-2 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setItemType('riunione')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all active:scale-95 ${
                itemType === 'riunione' ? 'border-blue-500 bg-blue-500/10' : 'border-border bg-card'
              }`}
            >
              <Users size={20} className={itemType === 'riunione' ? 'text-blue-400' : 'text-muted-foreground'} />
              <span className="text-sm font-medium">{t('ws_riunione')}</span>
            </button>
            <button
              onClick={() => setItemType('scadenza')}
              className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all active:scale-95 ${
                itemType === 'scadenza' ? 'border-amber-500 bg-amber-500/10' : 'border-border bg-card'
              }`}
            >
              <Clock size={20} className={itemType === 'scadenza' ? 'text-amber-400' : 'text-muted-foreground'} />
              <span className="text-sm font-medium">{t('ws_scadenza')}</span>
            </button>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('ws_item_name')}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('ws_item_name_ph')}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('ws_item_date')}</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t('ws_expected_earnings')}</label>
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
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>{t('annulla')}</Button>
          <Button onClick={handleSubmit} disabled={saving || !name.trim() || !date}>
            <Plus size={16} className="mr-1" /> {t('aggiungi')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}