import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Moon, CheckCircle, Calendar, Plus, Utensils, Briefcase } from 'lucide-react';
import { useT, useI18n } from '@/lib/i18n';
import {
  useActivities,
  useRatings,
  useDayEntries,
  useTasks,
  useOptimisticRating,
  useOptimisticDayEntry,
  useSubscription,
} from '@/lib/useAppData';
import RatingPicker from '@/components/RatingPicker';

const STORAGE_PREFIX = 'morning_checkin_';

function yesterdayISO() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function MorningCheckIn() {
  const t = useT();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dayRating, setDayRating] = useState(0);

  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: dayEntries } = useDayEntries();
  const { data: tasks } = useTasks();
  const optimisticRating = useOptimisticRating();
  const optimisticDayEntry = useOptimisticDayEntry();
  const sub = useSubscription();

  const yesterday = yesterdayISO();

  useEffect(() => {
    try {
      const seen = localStorage.getItem(STORAGE_PREFIX + yesterday);
      if (!seen) {
        // Only show if there are unrated activities or no day rating for yesterday
        const activeActivities = (activities || []).filter((a) => !a.archived);
        const yesterdayRatings = (ratings || []).filter((r) => r.date === yesterday);
        const ratedIds = new Set(yesterdayRatings.map((r) => r.activity_id));
        const hasUnrated = activeActivities.some((a) => !ratedIds.has(a.id));
        const yesterdayEntry = (dayEntries || []).find((e) => e.date === yesterday);
        const hasNoDayRating = !yesterdayEntry?.day_rating;

        // Don't show for new accounts with no activities
        if (activeActivities.length === 0) {
          localStorage.setItem(STORAGE_PREFIX + yesterday, '1');
          return;
        }
        if (hasUnrated || hasNoDayRating) {
          setOpen(true);
        } else {
          localStorage.setItem(STORAGE_PREFIX + yesterday, '1');
        }
      }
    } catch { /* ignore */ }
  }, [activities, ratings, dayEntries, yesterday]);

  const close = () => {
    try { localStorage.setItem(STORAGE_PREFIX + yesterday, '1'); } catch { /* ignore */ }
    setOpen(false);
  };

  if (!open) return null;

  const activeActivities = (activities || []).filter((a) => !a.archived);
  const yesterdayRatings = (ratings || []).filter((r) => r.date === yesterday);
  const yesterdayEntry = (dayEntries || []).find((e) => e.date === yesterday);
  const yesterdayTasks = (tasks || []).filter((task) => task.due_date === yesterday && task.status === 'active');

  const getActivityRating = (activityId) => {
    const r = yesterdayRatings.find((r) => r.activity_id === activityId);
    return r?.rating || 0;
  };

  const handleRate = async (activityId, rating) => {
    await optimisticRating(activityId, yesterday, rating);
  };

  const handleDayRate = async (rating) => {
    setDayRating(rating);
    await optimisticDayEntry(yesterdayEntry, yesterday, rating, yesterdayEntry?.thoughts || '');
  };

  const dateLabel = new Date(yesterday + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-md overflow-y-auto"
      >
        {/* Close button */}
        <button
          onClick={close}
          className="fixed top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted hover:bg-accent transition-colors"
        >
          <X size={20} />
        </button>

        <div className="max-w-lg mx-auto px-5 pt-16 pb-12 safe-top">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-foreground text-background mb-3">
              <Moon size={28} />
            </div>
            <h1 className="text-xl font-bold mb-1">{t('mci_title')}</h1>
            <p className="text-sm text-muted-foreground capitalize">{dateLabel}</p>
          </div>

          {/* Day rating */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <p className="text-sm font-semibold mb-3">{t('mci_rate_day')}</p>
            <div className="flex justify-center">
              <RatingPicker
                value={dayRating || yesterdayEntry?.day_rating || 0}
                onChange={handleDayRate}
                size="lg"
              />
            </div>
          </div>

          {/* Activities to rate */}
          <div className="rounded-2xl border border-border bg-card p-4 mb-4">
            <p className="text-sm font-semibold mb-3">{t('mci_rate_activities')}</p>
            {activeActivities.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">{t('mci_no_activities')}</p>
            ) : (
              <div className="space-y-3">
                {activeActivities.map((activity) => {
                  const currentRating = getActivityRating(activity.id);
                  return (
                    <div key={activity.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg shrink-0">{activity.emoji || '⭐'}</span>
                        <span className="text-sm truncate">{activity.name}</span>
                      </div>
                      <RatingPicker
                        value={currentRating}
                        onChange={(rating) => handleRate(activity.id, rating)}
                        size="sm"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Events/tasks for that date */}
          {yesterdayTasks.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Calendar size={16} className="text-muted-foreground" />
                <p className="text-sm font-semibold">{t('mci_events')}</p>
              </div>
              <div className="space-y-2">
                {yesterdayTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-2 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${task.type === 'meeting' ? 'bg-blue-500/15 text-blue-400' : task.type === 'deadline' ? 'bg-red-500/15 text-red-400' : 'bg-muted text-muted-foreground'}`}>
                      {task.type === 'meeting' ? t('tf_meeting') : task.type === 'deadline' ? t('tf_deadline') : t('tf_todo')}
                    </span>
                    <span className="truncate">{task.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick add links — premium only */}
          {sub.isPremium && (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => { close(); navigate('/body-fuel'); }}
              className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent/30 transition-colors"
            >
              <Utensils size={20} className="text-red-400 mb-2" />
              <p className="text-sm font-semibold">{t('mci_add_bodyfuel')}</p>
              <p className="text-xs text-muted-foreground">{t('mci_add_bodyfuel_sub')}</p>
            </button>
            <button
              onClick={() => { close(); navigate('/workspace'); }}
              className="rounded-2xl border border-border bg-card p-4 text-left hover:bg-accent/30 transition-colors"
            >
              <Briefcase size={20} className="text-blue-400 mb-2" />
              <p className="text-sm font-semibold">{t('mci_add_workspace')}</p>
              <p className="text-xs text-muted-foreground">{t('mci_add_workspace_sub')}</p>
            </button>
          </div>
          )}

          {/* Done button */}
          <button
            onClick={close}
            className="w-full rounded-2xl bg-foreground py-3 text-sm font-semibold text-background flex items-center justify-center gap-2"
          >
            <CheckCircle size={18} />
            {t('mci_done')}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}