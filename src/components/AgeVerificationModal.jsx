import { useState } from 'react';
import { Cake } from 'lucide-react';
import { useT } from '@/lib/i18n';

/**
 * Full-screen blocking modal that asks for the user's date of birth.
 * Shown after login if birth_date is not yet set in UserSettings.
 * Cannot be dismissed until the user enters a valid date.
 */
export default function AgeVerificationModal({ onSave }) {
  const t = useT();
  const [birthDate, setBirthDate] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const handleConfirm = async () => {
    if (!birthDate) {
      setError(t('age_invalid'));
      return;
    }
    const date = new Date(birthDate + 'T00:00:00');
    if (isNaN(date.getTime())) {
      setError(t('age_invalid'));
      return;
    }
    if (date > new Date()) {
      setError(t('age_future'));
      return;
    }
    setSaving(true);
    try {
      await onSave(birthDate);
    } catch (e) {
      setError(t('age_invalid'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-foreground/5 flex items-center justify-center mx-auto">
            <Cake size={32} className="text-foreground" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">{t('age_title')}</h2>
          <p className="text-sm text-muted-foreground">{t('age_subtitle')}</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">{t('age_birth_label')}</label>
          <input
            type="date"
            value={birthDate}
            onChange={(e) => { setBirthDate(e.target.value); setError(''); }}
            max={today}
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:outline-none focus:border-foreground/30"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <p className="text-xs text-muted-foreground/70 text-center px-2">{t('age_privacy')}</p>

        <button
          onClick={handleConfirm}
          disabled={saving || !birthDate}
          className="w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-40"
        >
          {saving ? '...' : t('age_confirm')}
        </button>
      </div>
    </div>
  );
}