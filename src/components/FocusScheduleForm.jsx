import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import DurationPicker from '@/components/DurationPicker';
import IphoneToggle from '@/components/IphoneToggle';
import { useT } from '@/lib/i18n';
import FocusBlockPicker from '@/components/FocusBlockPicker';
import { isScreenTimeSupported, getDefaultMode } from '@/lib/nativeScreenTime';

export default function FocusScheduleForm({ open, onClose, onSaved }) {
  const t = useT();
  const [title, setTitle] = useState('');
  const [when, setWhen] = useState('');
  const [duration, setDuration] = useState(25);
  const [spotify, setSpotify] = useState('');
  const [reminder, setReminder] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blockMode, setBlockMode] = useState(getDefaultMode);

  const reset = () => {
    setTitle(''); setWhen(''); setSpotify(''); setDuration(25); setReminder(true);
  };

  const handleSave = async () => {
    if (!title.trim() || !when) return;
    setSaving(true);
    try {
      await onSaved({
        title: title.trim(),
        scheduled_at: new Date(when).toISOString(),
        duration_minutes: Number(duration),
        spotify_url: spotify.trim() || null,
        reminder_enabled: reminder,
      }, blockMode);
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
          <DialogTitle>{t('ft_programma')} {t('oggi_focus')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>{t('gf_titolo')}</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('tf_titolo_ph')} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('tf_quando')}</Label>
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="[color-scheme:dark]" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('ft_quanto')}</Label>
            <DurationPicker value={duration} onChange={setDuration} />
          </div>
          <div className="space-y-1.5">
            <Label>Spotify</Label>
            <Input value={spotify} onChange={(e) => setSpotify(e.target.value)} placeholder="https://open.spotify.com/playlist/..." />
          </div>
          <div className="flex items-center justify-between">
            <Label>{t('ft_promemoria')}</Label>
            <IphoneToggle checked={reminder} onChange={setReminder} />
          </div>
          {isScreenTimeSupported() && (
            <div className="space-y-1.5">
              <Label>{t('fb_titolo')}</Label>
              <FocusBlockPicker mode={blockMode} onChange={setBlockMode} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t('annulla')}</Button>
          <Button onClick={handleSave} disabled={saving || !title.trim() || !when || duration < 1}>
            {saving ? t('salvataggio') : t('ft_programma')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}