import { useState } from 'react';
import { motion } from 'framer-motion';
import { Image } from '@/components/ui/image';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Clock } from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { useQueryClient } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';

export default function OnboardingReminder() {
  const { user } = useAuth();
  const t = useT();
  const [time, setTime] = useState('21:00');
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const handleStart = async () => {
    setSaving(true);
    try {
      const existing = await getDB().UserSettings.filter({ created_by_id: user.id }, '-created_date', 10);
      if (existing.length > 0) {
        await getDB().UserSettings.update(existing[0].id, {
          reminder_time: time,
          onboarded: true,
          reminder_enabled: true,
        });
      } else {
        await getDB().UserSettings.create({
          reminder_time: time,
          onboarded: true,
          reminder_enabled: true,
        });
      }
      qc.invalidateQueries(['userSettings']);
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 bg-background safe-top">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-6 w-full max-w-sm"
      >
        <div className="w-24 h-24">
          <Image src={LOGO_URL} alt="Focused" fittingType="fit" className="w-full h-full object-contain" />
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">{t('onb_benvenuto')}{user?.full_name ? `, ${user.full_name}` : ''}</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t('onb_sub')}
          </p>
        </div>
        <div className="w-full space-y-3">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">{t('onb_orario')}</Label>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-4 py-4">
            <Clock size={20} className="text-muted-foreground" />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="flex-1 bg-transparent text-lg font-semibold text-foreground outline-none [color-scheme:dark]"
            />
          </div>
        </div>
        <Button
          onClick={handleStart}
          disabled={saving}
          className="w-full rounded-2xl py-6 text-base font-semibold"
        >
          {saving ? t('caricamento') : t('onb_inizia')}
        </Button>
      </motion.div>
    </div>
  );
}