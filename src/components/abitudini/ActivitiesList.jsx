import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Lock } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useActivities, useRatings, useUserSettings, useOptimisticRating, useOptimisticActivitySave, useSubscription } from '@/lib/useAppData';
import { useQueryClient } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import { CATEGORIES, PRESET_ACTIVITIES } from '@/lib/constants';
import { Image } from '@/components/ui/image';
import ActivityIcon from '@/components/ActivityIcon';
import { computeStreak, todayISO } from '@/lib/productivity';
import ActivityForm from '@/components/ActivityForm';
import StreakBadge from '@/components/StreakBadge';
import RatingPicker from '@/components/RatingPicker';
import PremiumModal from '@/components/PremiumModal';
import ActivityCardBg from '@/components/ActivityCardBg';
import { isMinor } from '@/lib/ageCheck';

// Estratto da Abitudini.jsx per essere riusato anche in Home (Oggi.jsx) —
// stessa lista, stessa logica, un solo posto da mantenere.
export default function ActivitiesList() {
  const navigate = useNavigate();
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: settings } = useUserSettings();
  const optimisticRate = useOptimisticRating();
  const optimisticActivitySave = useOptimisticActivitySave();
  const qc = useQueryClient();
  const t = useT();
  const today = todayISO();
  const [formOpen, setFormOpen] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const sub = useSubscription();
  const userIsMinor = isMinor(settings?.birth_date);

  const handleRate = (activityId, rating) => optimisticRate(activityId, today, rating);

  const handleAddPreset = async (preset) => {
    const existing = (activities || []).find((a) => a.preset_type === preset.presetType || (preset.presetType === 'gym' && a.is_gym));
    if (existing) return;
    try {
      await optimisticActivitySave(null, {
        name: preset.name,
        category: preset.category,
        emoji: preset.emoji,
        preset_type: preset.presetType,
        is_gym: preset.presetType === 'gym',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const activeActivities = (activities || []).filter((a) => !a.archived && !a.is_gym && !a.preset_type);
  const sorted = [...activeActivities].sort((a, b) => a.category.localeCompare(b.category));
  const presetAdded = (activities || []).filter((a) => !a.archived && (a.preset_type || a.is_gym) && !(userIsMinor && a.preset_type === 'quit_smoking'));

  useEffect(() => {
    if (!activities) return;
    const presetTypes = ['gym', 'phone_time', 'reading', 'quit_smoking'];
    const toDelete = [];
    presetTypes.forEach((pt) => {
      const matches = activities.filter((a) => pt === 'gym' ? (a.preset_type === 'gym' || a.is_gym) : a.preset_type === pt);
      if (matches.length > 1) {
        const s = [...matches].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''));
        toDelete.push(...s.slice(1).map((a) => a.id));
      }
    });
    if (toDelete.length > 0) {
      getDB().Activity.deleteMany({ id: { $in: toDelete } }).then(() => qc.invalidateQueries(['activities'])).catch(console.error);
    }
  }, [activities, qc]);

  const renderRow = (activity) => {
    const aRatings = (ratings || []).filter((r) => r.activity_id === activity.id);
    const streak = computeStreak(aRatings);
    const todayRating = aRatings.find((r) => r.date === today)?.rating;
    const catName = activity.category === 'custom'
      ? activity.custom_category_name || t('riep_personalizzata')
      : t('cat_' + activity.category + '_short');
    return (
      <ActivityCardBg key={activity.id} activity={activity}>
        <div className="flex w-full items-center justify-between gap-3 p-4">
          <button
            onClick={() => navigate(`/attivita/${activity.id}`)}
            className="flex flex-1 min-w-0 flex-col gap-0.5 text-left"
          >
            <span className="font-medium truncate flex items-center gap-1.5">{activity.emoji ? <ActivityIcon name={activity.emoji} size={14} /> : null}{activity.name}</span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground truncate">{catName}</span>
              <span className="text-muted-foreground/30 shrink-0">·</span>
              <span className="text-xs text-muted-foreground shrink-0">{aRatings.length} {t('riep_voti')}</span>
            </div>
            <StreakBadge streak={streak} size="sm" />
          </button>
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            <RatingPicker value={todayRating} onChange={(v) => handleRate(activity.id, v)} size="sm" />
          </div>
        </div>
      </ActivityCardBg>
    );
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('nav_abitudini')}</h2>
        <button
          onClick={() => setFormOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
        >
          <Plus size={14} /> {t('nuova')}
        </button>
      </div>

      {settings && (
        <div className="mb-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {PRESET_ACTIVITIES.filter((p) => !(userIsMinor && p.presetType === 'quit_smoking')).map((preset) => {
              const existing = (activities || []).find((a) => a.preset_type === preset.presetType || (preset.presetType === 'gym' && a.is_gym));
              const aRatings = existing ? (ratings || []).filter((r) => r.activity_id === existing.id) : [];
              const streak = computeStreak(aRatings);
              return (
                <div key={preset.presetType} className="shrink-0 w-36">
                  <div className="relative w-36 h-36 rounded-2xl border border-border overflow-hidden">
                    <div className="absolute inset-0">
                      <Image src={preset.imageUrl} alt={preset.name} fittingType="fill" className="w-full h-full" />
                    </div>
                    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
                      {existing ? (
                        <button onClick={() => navigate(`/attivita/${existing.id}`)} className="w-full h-full flex flex-col items-center justify-center gap-1">
                          <span className="text-xs font-medium text-center px-1">{preset.name}</span>
                          <StreakBadge streak={streak} size="sm" />
                        </button>
                      ) : (
                        <button onClick={() => sub.isPro ? handleAddPreset(preset) : setShowPremium(true)} className="w-full h-full flex flex-col items-center justify-center gap-1">
                          {sub.isPro ? <Plus size={20} /> : <Lock size={20} />}
                          <span className="text-xs font-medium text-center px-1">{preset.name}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {presetAdded.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('at_plus')}</h2>
          <div className="space-y-2">{presetAdded.map(renderRow)}</div>
        </section>
      )}

      {sorted.length === 0 ? (
        presetAdded.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground text-sm mb-4">{t('at_nessuna')}</p>
            <button
              onClick={() => setFormOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
            >
              <Plus size={16} /> {t('aggiungi')}
            </button>
          </div>
        )
      ) : (
        <div className="space-y-4">
          {CATEGORIES.map((cat) => {
            const items = sorted.filter((a) => a.category === cat.id);
            if (items.length === 0) return null;
            return (
              <section key={cat.id}>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('cat_' + cat.id)}
                </h2>
                <div className="space-y-2">{items.map(renderRow)}</div>
              </section>
            );
          })}
          {sorted.filter((a) => a.category === 'custom').length > 0 && (
            <section>
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('at_personalizzate')}
              </h2>
              <div className="space-y-2">
                {sorted.filter((a) => a.category === 'custom').map(renderRow)}
              </div>
            </section>
          )}
        </div>
      )}

      <ActivityForm open={formOpen} onClose={() => setFormOpen(false)} activity={null} />
      <PremiumModal open={showPremium} onClose={() => setShowPremium(false)} />
    </div>
  );
}
