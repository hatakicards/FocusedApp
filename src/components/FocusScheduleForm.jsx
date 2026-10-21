import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n, useT } from '@/lib/i18n';
import FocusBlockPicker from '@/components/FocusBlockPicker';
import { isScreenTimeSupported, getDefaultMode } from '@/lib/nativeScreenTime';
import { WEEK_ORDER, dayLabels, isValidWindow, scheduleDuration } from '@/lib/focusSchedule';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const WORKDAYS = [1, 2, 3, 4, 5];

// Programma ricorrente: "ogni giovedi' dalle 15:00 alle 18:00". Nel periodo scelto il
// blocco parte da solo, senza dover aprire l'app.
export default function FocusScheduleForm({ open, onClose, onSaved }) {
  const t = useT();
  const { locale } = useI18n();
  const [title, setTitle] = useState('');
  const [days, setDays] = useState(WORKDAYS);
  const [start, setStart] = useState('09:00');
  const [end, setEnd] = useState('12:00');
  const [blockMode, setBlockMode] = useState(() => (getDefaultMode() === 'off' ? 'selected' : getDefaultMode()));
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);

  const labels = dayLabels(locale, 'short');
  const toggleDay = (d) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const windowOk = isValidWindow(start, end);
  const daysOk = days.length > 0;

  const reset = () => {
    setTitle(''); setDays(WORKDAYS); setStart('09:00'); setEnd('12:00'); setTouched(false);
  };

  const handleSave = async () => {
    setTouched(true);
    if (!windowOk || !daysOk) return;
    setSaving(true);
    try {
      await onSaved({
        title: title.trim() || t('ft_progr_nuovo'),
        scheduled_at: new Date().toISOString(),
        duration_minutes: scheduleDuration(start, end),
        is_recurring: true,
        repeat_days: [...days].sort((a, b) => a - b),
        start_time: start,
        end_time: end,
        block_mode: blockMode,
        schedule_active: true,
      });
      reset();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ft_progr_nuovo')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('gf_titolo')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tf_titolo_ph')} />
          </div>

          <div className="space-y-2">
            <Label>{t('ft_giorni')}</Label>
            <div className="flex gap-1.5">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition-colors ${
                    days.includes(d) ? 'bg-foreground text-background' : 'border border-border text-muted-foreground'
                  }`}
                >
                  {labels[d].slice(0, 3)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDays(ALL_DAYS)} className="text-xs text-muted-foreground underline underline-offset-2">
                {t('ft_tutti_giorni')}
              </button>
              <button type="button" onClick={() => setDays(WORKDAYS)} className="text-xs text-muted-foreground underline underline-offset-2">
                {t('ft_feriali')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{t('ft_dalle')}</Label>
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="[color-scheme:dark]" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('ft_alle')}</Label>
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="[color-scheme:dark]" />
            </div>
          </div>

          {isScreenTimeSupported() && (
            <div className="space-y-1.5">
              <Label>{t('fb_titolo')}</Label>
              <FocusBlockPicker mode={blockMode} onChange={setBlockMode} />
            </div>
          )}

          {touched && !daysOk && <p className="text-xs text-destructive">{t('ft_err_giorni')}</p>}
          {touched && daysOk && !windowOk && <p className="text-xs text-destructive">{t('ft_err_orario')}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('annulla')}</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t('salvataggio') : t('ft_programma')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
