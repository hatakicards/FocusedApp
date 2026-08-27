import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n, useT, weekdayShortByMonSun } from '@/lib/i18n';
import { useActivities } from '@/lib/useAppData';
import BottomSelect from '@/components/BottomSelect';

const TYPES = ['todo', 'project', 'weekly', 'one_time', 'meeting', 'deadline'];
const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function TaskForm({ open, onClose, onSaved, task }) {
  const { data: activities } = useActivities();
  const { locale } = useI18n();
  const t = useT();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('todo');
  const [notes, setNotes] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [recurrence, setRecurrence] = useState(1);
  const [weekdays, setWeekdays] = useState([]);
  const [linkedActivity, setLinkedActivity] = useState('');
  const [repeatable, setRepeatable] = useState(false);
  const [expectedEarnings, setExpectedEarnings] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title || '');
    setType(task?.type || 'todo');
    setNotes(task?.notes || '');
    setDueDate(task?.due_date || '');
    setExpiryDate(task?.expiry_date || '');
    setRecurrence(task?.recurrence_per_week || 1);
    setWeekdays(task?.weekdays || []);
    setLinkedActivity(task?.linked_activity_id || '');
    setRepeatable(task?.repeatable || false);
    setExpectedEarnings(task?.expected_earnings?.toString() || '');
  }, [open, task]);

  const toggleWeekday = (id) => {
    setWeekdays((prev) => (prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]));
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    await onSaved({
      title: title.trim(),
      type,
      notes: notes.trim(),
      due_date: dueDate || null,
      expiry_date: type === 'project' ? expiryDate || null : null,
      recurrence_per_week: type === 'weekly' ? Number(recurrence) : null,
      weekdays: type === 'weekly' ? weekdays : [],
      linked_activity_id: linkedActivity || null,
      repeatable: type === 'one_time' ? repeatable : false,
      expected_earnings: (type === 'todo' || type === 'one_time' || type === 'meeting' || type === 'deadline') && expectedEarnings ? Number(expectedEarnings) : 0,
    });
    setSaving(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? t('tf_modifica') : t('tf_nuovo')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('tf_titolo')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tf_titolo_ph')} />
          </div>

          <div className="space-y-1.5">
            <Label>{t('tf_tipo')}</Label>
            <BottomSelect
              value={type}
              onValueChange={setType}
              options={TYPES.map((tp) => ({ value: tp, label: t('tf_' + tp) }))}
              label={t('tf_tipo')}
            />
          </div>

          {type === 'project' && (
            <div className="space-y-1.5">
              <Label>{t('tf_scad_proj')}</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="[color-scheme:dark]" />
              <p className="text-xs text-muted-foreground">{t('tf_scad_proj_desc')}</p>
            </div>
          )}

          {type === 'weekly' && (
            <>
              <div className="space-y-1.5">
                <Label>{t('tf_quante')}</Label>
                <BottomSelect
                  value={String(recurrence)}
                  onValueChange={(v) => setRecurrence(Number(v))}
                  options={[1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: `${n} ${t('tf_volte')}` }))}
                  label={t('tf_quante')}
                />
              </div>
              <div className="space-y-1.5">
                <Label>{t('tf_giorni')}</Label>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAYS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleWeekday(d)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium border ${weekdays.includes(d) ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
                    >
                      {weekdayShortByMonSun(locale, d)}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {type === 'one_time' && (
            <div className="space-y-1.5">
              <Label>{t('tf_quando')}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="[color-scheme:dark]" />
              <label className="flex items-center gap-2 pt-1 text-sm">
                <input type="checkbox" checked={repeatable} onChange={(e) => setRepeatable(e.target.checked)} />
                {t('tf_ripetersi')}
              </label>
            </div>
          )}

          {type === 'todo' && (
            <div className="space-y-1.5">
              <Label>{t('tf_scad_opz')}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="[color-scheme:dark]" />
            </div>
          )}

          {(type === 'meeting' || type === 'deadline') && (
            <div className="space-y-1.5">
              <Label>{t('tf_quando')}</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="[color-scheme:dark]" />
            </div>
          )}

          {(type === 'todo' || type === 'one_time' || type === 'meeting' || type === 'deadline') && (
            <div className="space-y-1.5">
              <Label>{t('ws_expected_earnings')}</Label>
              <div className="relative">
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={expectedEarnings}
                  onChange={(e) => setExpectedEarnings(e.target.value)}
                  placeholder="0"
                  className="pr-8 [color-scheme:dark]"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">€</span>
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{t('tf_collega')}</Label>
            <BottomSelect
              value={linkedActivity}
              onValueChange={setLinkedActivity}
              options={[
                { value: '', label: t('tf_nessuna') },
                ...(activities || []).filter((a) => !a.archived).map((a) => ({ value: a.id, label: a.name })),
              ]}
              label={t('tf_collega')}
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t('tf_note')}</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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