import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BottomSelect from '@/components/BottomSelect';
import EmojiPicker from '@/components/EmojiPicker';
import { useT } from '@/lib/i18n';
import { CATEGORIES } from '@/lib/constants';
import { useOptimisticActivitySave } from '@/lib/useAppData';

export default function ActivityForm({ open, onClose, activity, onSaved }) {
  const t = useT();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('fitness');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [emoji, setEmoji] = useState('star');
  const [saving, setSaving] = useState(false);
  const optimisticSave = useOptimisticActivitySave();

  useEffect(() => {
    if (open) {
      setName(activity?.name || '');
      setCategory(activity?.category || 'fitness');
      setCustomCategoryName(activity?.custom_category_name || '');
      setEmoji(activity?.emoji || 'star');
    }
  }, [open, activity]);

  const isCustom = category === 'custom';

  const handleSave = () => {
    if (!name.trim()) return;
    const payload = {
      name: name.trim(),
      category,
      custom_category_name: isCustom ? customCategoryName.trim() : undefined,
      emoji,
    };
    // Close dialog immediately — optimistic update already happened in cache
    onClose();
    // Server call runs in background, cache is already updated
    optimisticSave(activity, payload).catch(console.error);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{activity ? t('af_modifica') : t('af_nuovo')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('af_simbolo')}</Label>
            <EmojiPicker value={emoji} onChange={setEmoji} />
          </div>
          <div className="space-y-2">
            <Label>{t('af_nome')}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('af_nome_ph')}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>{t('af_categoria')}</Label>
            <BottomSelect
              value={category}
              onValueChange={setCategory}
              label={t('af_categoria')}
              options={[
                ...CATEGORIES.map((c) => ({ value: c.id, label: t('cat_' + c.id) })),
                { value: 'custom', label: t('riep_personalizzata') },
              ]}
            />
          </div>
          {isCustom && (
            <div className="space-y-2">
              <Label>{t('af_nome_categoria')}</Label>
              <Input
                value={customCategoryName}
                onChange={(e) => setCustomCategoryName(e.target.value)}
                placeholder={t('af_nome_cat_ph')}
              />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('annulla')}</Button>
          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? t('salvataggio') : t('salva')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}