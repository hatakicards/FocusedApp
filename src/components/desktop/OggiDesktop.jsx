import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Focus, Zap } from 'lucide-react';
import { useDayEntries, useOptimisticDayEntry, useUserSettings } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useI18n, useT } from '@/lib/i18n';
import RatingPicker from '@/components/RatingPicker';
import DynamicFeedback from '@/components/profile/DynamicFeedback';
import MotivationSection from '@/components/MotivationSection';
import { useEffect } from 'react';

export default function OggiDesktop() {
  const navigate = useNavigate();
  const { data: entries } = useDayEntries();
  const { data: settings } = useUserSettings();
  const optimisticDayEntry = useOptimisticDayEntry();
  const { locale } = useI18n();
  const t = useT();
  const today = todayISO();
  const todayEntry = (entries || []).find((e) => e.date === today);

  const [rating, setRating] = useState(0);
  const [thoughts, setThoughts] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (todayEntry) {
      setRating(todayEntry.day_rating || 0);
      setThoughts(todayEntry.thoughts || '');
    }
  }, [todayEntry]);

  const profileType = settings?.profile_type || 'base';
  const questionKey = `oggi_q_${profileType}`;

  const dateLabel = new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  const handleSave = async () => {
    if (rating === 0) return;
    setSaving(true);
    try {
      await optimisticDayEntry(todayEntry, today, rating, thoughts.trim());
      setSaved(true);
      setShowFeedback(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="safe-top px-5 pb-8 min-h-screen">
      {/* TWO COLUMNS: left = "how much did you improve", right = Focus Time (same height) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: question + rating + thoughts + save */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center pt-2">
            <p className="text-xs text-muted-foreground capitalize mb-2">{dateLabel}</p>
            <h1 className="text-2xl font-bold tracking-tight text-center leading-tight px-2">
              {t(questionKey)}
            </h1>
          </div>

          <div className="flex flex-col items-center">
            <RatingPicker
              value={rating}
              onChange={(v) => {
                setRating(v);
                setSaved(false);
                setShowFeedback(false);
              }}
            />
          </div>

          <textarea
            value={thoughts}
            onChange={(e) => {
              setThoughts(e.target.value);
              setSaved(false);
            }}
            placeholder={t('oggi_placeholder')}
            rows={5}
            className="w-full rounded-2xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
          />

          <button
            onClick={handleSave}
            disabled={rating === 0 || saving}
            className="w-full rounded-2xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2 transition-opacity"
          >
            {saved ? (
              <>
                <Check size={16} /> {t('oggi_salvato')}
              </>
            ) : saving ? (
              t('oggi_salvataggio')
            ) : (
              t('oggi_salva')
            )}
          </button>

          {showFeedback && rating > 0 && (
            <DynamicFeedback rating={rating} profileType={profileType} />
          )}

          {todayEntry && !showFeedback && (
            <p className="text-center text-xs text-muted-foreground">
              {t('oggi_gia')}
            </p>
          )}
        </div>

        {/* RIGHT: Focus Time — stretches to match left column height */}
        <button
          onClick={() => navigate('/focus')}
          className="rounded-3xl border border-border bg-card p-6 flex flex-col items-center justify-center gap-4 hover:border-foreground/30 transition-colors active:scale-[0.98] min-h-[300px] lg:min-h-0"
        >
          <div className="w-24 h-24 rounded-2xl bg-foreground/5 flex items-center justify-center">
            <Focus size={48} strokeWidth={1.5} className="text-foreground" />
          </div>
          <span className="text-lg font-semibold">{t('oggi_focus')}</span>
        </button>
      </div>

      {/* MOTIVATION: full width, under both columns */}
      <div className="mt-6 rounded-3xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={16} className="text-foreground" />
          <h3 className="text-sm font-semibold">{t('motivation_title')}</h3>
        </div>
        <MotivationSection profileType={profileType} />
      </div>
    </div>
  );
}