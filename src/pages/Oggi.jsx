import { useState, useEffect } from 'react';
import { Check, Focus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Image } from '@/components/ui/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { useDayEntries, useInvalidateAll, useOptimisticDayEntry, useUserSettings } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { PROFILE_TYPES, PROFILE_VIDEOS } from '@/lib/constants';
import { useI18n, useT } from '@/lib/i18n';
import RatingPicker from '@/components/RatingPicker';
import PullToRefresh from '@/components/PullToRefresh';
import DynamicFeedback from '@/components/profile/DynamicFeedback';
import CharacterVideo from '@/components/CharacterVideo';
import TutorialDialog from '@/components/TutorialDialog';
import MotivationSection from '@/components/MotivationSection';
import FocusyAssistant from '@/components/FocusyAssistant';
export default function Oggi() {
  const navigate = useNavigate();
  const { data: entries } = useDayEntries();
  const { data: settings } = useUserSettings();
  const invalidate = useInvalidateAll();
  const optimisticDayEntry = useOptimisticDayEntry();
  const { locale } = useI18n();
  const t = useT();
  const isMobile = useIsMobile();
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
  const profile = PROFILE_TYPES.find((p) => p.id === profileType) || PROFILE_TYPES[0];
  const questionKey = `oggi_q_${profileType}`;

  const dateLabel = new Date().toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

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
    <PullToRefresh onRefresh={invalidate}>
    <div className="px-5 pb-8 flex flex-col min-h-screen">
      {/* === MOBILE: Hero with decorative statue image === */}
      {isMobile && (
        <>
          <div className="relative mb-4" style={{ width: '100vw', marginLeft: '-20px' }}>
            {/* Full-width decorative image (no hitboxes) */}
            <div className="relative w-full aspect-[3/4] pointer-events-none select-none overflow-hidden">
              <img
                src="/images/focusedstatue.png"
                alt=""
                draggable={false}
                className="w-full h-full object-cover object-center"
              />
            </div>
            {/* Date + question overlaid at top */}
            <div className="absolute top-0 left-0 right-0 flex flex-col items-center justify-center pt-8 px-5 pointer-events-none">
              <p className="text-xs text-white/80 capitalize mb-2">{dateLabel}</p>
              <h1 className="text-2xl font-bold tracking-tight text-center leading-tight">
                {t(questionKey)}
              </h1>
            </div>
            {/* Rating picker overlaid on image - perfectly centered */}
            <div className="absolute inset-0 flex items-center justify-center">
              <RatingPicker
                value={rating}
                onChange={(v) => {
                  setRating(v);
                  setSaved(false);
                  setShowFeedback(false);
                }}
              />
            </div>
          </div>
          {/* Textarea pulled up to cover image bottom — full width, touches both margins */}
          <div className="relative -mt-20 z-10 mb-4" style={{ width: '100vw', marginLeft: '-20px' }}>
            <textarea
              value={thoughts}
              onChange={(e) => {
                setThoughts(e.target.value);
                setSaved(false);
              }}
              placeholder={t('oggi_placeholder')}
              rows={5}
              className="w-full rounded-t-3xl border border-border bg-card p-4 text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
            />
          </div>
        </>
      )}

      {/* === DESKTOP: Original layout === */}
      {!isMobile && (
        <div className="safe-top">
        <>
          <div className="flex flex-col items-center pt-2 mb-6">
            <p className="text-xs text-muted-foreground capitalize mb-2">{dateLabel}</p>
            <h1 className="text-2xl font-bold tracking-tight text-center leading-tight px-2">
              {t(questionKey)}
            </h1>
          </div>

          <div className="flex flex-col items-center mb-6">
            <RatingPicker
              value={rating}
              onChange={(v) => {
                setRating(v);
                setSaved(false);
                setShowFeedback(false);
              }}
            />
          </div>

          <div className="mb-4">
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
          </div>
        </>
        </div>
      )}

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

      <FocusyAssistant />

      <div className="mt-4">
        <button
          onClick={() => navigate('/focus')}
          className="w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold text-foreground flex items-center justify-center gap-2"
        >
          <Focus size={18} /> {t('oggi_focus')}
        </button>
      </div>

      <MotivationSection profileType={profileType} />

      {todayEntry && !showFeedback && (
        <p className="text-center text-xs text-muted-foreground mt-4">
          {t('oggi_gia')}
        </p>
      )}
    </div>
    <TutorialDialog pageId="oggi" />
    </PullToRefresh>
  );
}