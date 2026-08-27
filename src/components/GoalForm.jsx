import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import BottomSelect from '@/components/BottomSelect';
import { useT } from '@/lib/i18n';
import { useOptimisticGoalSave } from '@/lib/useAppData';

const TIMEFRAMES = ['daily', 'weekly', 'monthly', 'annual', 'lifetime'];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

export default function GoalForm({ open, onClose, activityId, goal, onSaved }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [timeframe, setTimeframe] = useState('daily');
  const [difficulty, setDifficulty] = useState('easy');
  const [saving, setSaving] = useState(false);
  const optimisticSave = useOptimisticGoalSave();

  useEffect(() => {
    if (open) {
      setTitle(goal?.title || '');
      setTimeframe(goal?.timeframe || 'daily');
      setDifficulty(goal?.difficulty || 'easy');
    }
  }, [open, goal]);

  const handleSave = () => {
    if (!title.trim()) return;
    const payload = {
      title: title.trim(),
      timeframe,
      difficulty,
      activity_id: activityId,
    };
    // Close dialog immediately — optimistic update handles the cache
    onClose();
    optimisticSave(goal, payload).catch(console.error);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{goal ? t('gf_modifica') : t('gf_nuovo')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>{t('gf_titolo')}</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('gf_titolo_ph')}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label>{t('gf_frequenza')}</Label>
            <BottomSelect
              value={timeframe}
              onValueChange={setTimeframe}
              label={t('gf_frequenza')}
              options={TIMEFRAMES.map((value) => ({ value, label: t('tf_' + value) }))}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('gf_difficolta')}</Label>
            <BottomSelect
              value={difficulty}
              onValueChange={setDifficulty}
              label={t('gf_difficolta')}
              options={DIFFICULTIES.map((value) => ({ value, label: t('diff_' + value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('annulla')}</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? t('salvataggio') : t('salva')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}