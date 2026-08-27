import { useState } from 'react';
import { Image } from '@/components/ui/image';
import { useUserSettings, useOptimisticLifeStatSave } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { LOGO_URL } from '@/lib/constants';
import { defaultScores } from '@/lib/statsConfig';
import StatSliders from './StatSliders';

export default function StatsSetupModal({ onClose }) {
  const { data: settings } = useUserSettings();
  const t = useT();
  const optimisticLifeStatSave = useOptimisticLifeStatSave();
  const [values, setValues] = useState(defaultScores());
  const [saving, setSaving] = useState(false);

  const profileType = settings?.profile_type || 'base';

  const handleSave = async () => {
    setSaving(true);
    try {
      await optimisticLifeStatSave(null, values, true);
      onClose?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto px-5 safe-top pb-10">
      <div className="flex flex-col items-center text-center mb-8 pt-4">
        <div className="w-16 h-16 mb-3">
          <Image src={LOGO_URL} alt="Focused" fittingType="fit" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{t('ss_titolo')}</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-xs">{t('ss_desc')}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 mb-6">
        <StatSliders values={values} onChange={setValues} disabled={saving} profileType={profileType} />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-40"
      >
        {saving ? t('salvataggio') : t('ss_inizia')}
      </button>
    </div>
  );
}