import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, CalendarClock, Repeat, Timer, Circle, Dumbbell, CalendarCheck, Users, Clock, BookOpen } from 'lucide-react';
import {
  useActivities, useRatings, useTasks, useGymSessions, useUserSettings, useInvalidateAll, useVerifiche,
  useOptimisticTaskSave, useOptimisticTaskToggle, useOptimisticTaskRate, useOptimisticTaskArchive,
  useBooks,
} from '@/lib/useAppData';
import GymSessionDialog from '@/components/gym/GymSessionDialog';
import FocusTimeCard from '@/components/profile/FocusTimeCard';
import { useI18n, useT, weekdayShortByMonSun } from '@/lib/i18n';
import { todayISO } from '@/lib/productivity';
import { getDB } from '@/lib/guestDB';
import TaskForm from '@/components/TaskForm';
import AgendaCalendarView from '@/components/AgendaCalendarView';
import TaskRatingPrompt from '@/components/TaskRatingPrompt';
import ActivityCardBg from '@/components/ActivityCardBg';
import { GYM_IMAGE_URL } from '@/lib/constants';
import { Image } from '@/components/ui/image';

const TYPE_META = {
  todo: { key: 'ag_type_todo', icon: Circle },
  project: { key: 'ag_type_project', icon: Timer },
  weekly: { key: 'ag_type_weekly', icon: Repeat },
  one_time: { key: 'ag_type_onetime', icon: CalendarClock },
  meeting: { key: 'ag_type_meeting', icon: Users },
  deadline: { key: 'ag_type_deadline', icon: Clock },
};

export default function AgendaDesktop() {
  const navigate = useNavigate();
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: settings } = useUserSettings();
  const { data: gymSessions } = useGymSessions();
  const { data: verifiche } = useVerifiche();
  const { data: books } = useBooks();
  const invalidate = useInvalidateAll();
  const optimisticTaskSave = useOptimisticTaskSave();
  const optimisticTaskToggle = useOptimisticTaskToggle();
  const optimisticTaskRate = useOptimisticTaskRate();
  const optimisticTaskArchive = useOptimisticTaskArchive();
  const { locale } = useI18n();
  const t = useT();
  const today = todayISO();

  const [formOpen, setFormOpen] = useState(false);
  const [rateTask, setRateTask] = useState(null);
  const [gymDialog, setGymDialog] = useState(null);

  const { data: tasks } = useTasks();

  const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayGymSession = settings?.gym_enabled
    ? (gymSessions || []).find((s) => s.day_of_week === WEEKDAY_IDS[new Date().getDay()])
    : null;

  const activeActivities = (activities || []).filter((a) => !a.archived && !a.is_gym && !a.preset_type);
  const activeTasks = (tasks || []).filter((t) => t.status === 'active');
  const upcomingVerifiche = (verifiche || []).filter((v) => v.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));
  const bookDeadlines = (books || []).filter((b) => b.status === 'reading' && b.target_date).sort((a, b) => a.target_date.localeCompare(b.target_date));
  const now = new Date();
  const isExpired = (task) => task.type === 'project' && task.expiry_date && new Date(task.expiry_date) < now;

  const handleToggle = async (task) => {
    const updated = await optimisticTaskToggle(task);
    if (updated.status === 'done') setRateTask(updated);
  };
  const handleRate = async ({ rating, earnings }) => {
    if (!rateTask) return;
    await optimisticTaskRate(rateTask.id, { rating, earnings: earnings || 0 });
    if (earnings && rateTask.due_date) {
      try {
        const existingLogs = await getDB().WorkDayLog.filter({ date: rateTask.due_date }, '-date', 5);
        if (existingLogs.length > 0) {
          const log = existingLogs[0];
          await getDB().WorkDayLog.update(log.id, { earnings: (log.earnings || 0) + Number(earnings) });
        } else {
          await getDB().WorkDayLog.create({ date: rateTask.due_date, earnings: Number(earnings) });
        }
        invalidate();
      } catch (e) { console.error(e); }
    }
    setRateTask(null);
  };
  const handleArchive = (task) => optimisticTaskArchive(task).catch(console.error);
  const handleSaveTask = async (payload) => { await optimisticTaskSave(payload); };

  const ratingFor = (activityId) => {
    const rs = (ratings || []).filter((r) => r.activity_id === activityId);
    return rs.length ? rs.sort((a, b) => b.date.localeCompare(a.date))[0].rating : null;
  };
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString(locale, { day: 'numeric', month: 'short' }) : '';

  const renderTask = (task) => {
    const meta = TYPE_META[task.type];
    const Icon = meta.icon;
    const expired = isExpired(task);
    return (
      <div key={task.id} className="rounded-xl border border-border bg-card p-3 flex items-center gap-2.5">
        <button
          onClick={() => handleToggle(task)}
          className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center ${task.status === 'done' ? 'bg-foreground border-foreground' : 'border-border'}`}
        >
          {task.status === 'done' && <Check size={12} className="text-background" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium truncate">{task.title}</span>
            {expired && <span className="shrink-0 text-[9px] text-destructive font-semibold">{t('ag_scaduto')}</span>}
          </div>
          <div className="flex items-center gap-1 text-[9px] text-muted-foreground mt-0.5">
            <Icon size={10} /> {t(meta.key)}
            {task.due_date && <> · {fmtDate(task.due_date)}</>}
            {task.expiry_date && <> · {t('ag_scad')} {fmtDate(task.expiry_date)}</>}
            {task.type === 'weekly' && task.weekdays?.length > 0 && <> · {task.weekdays.map((d) => weekdayShortByMonSun(locale, d)).join(' ')}</>}
            {task.rating != null && <> · {task.rating}/5</>}
          </div>
        </div>
        {expired && (
          <button onClick={() => handleArchive(task)} className="shrink-0 text-[9px] font-medium text-muted-foreground px-1.5 py-1 rounded-lg bg-foreground/5">
            {t('ag_archivia')}
          </button>
        )}
      </div>
    );
  };

  const byType = (type) => activeTasks.filter((task) => task.type === type);

  return (
    <div className="safe-top px-5 pb-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">{t('nav_agenda')}</h1>
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background"
          >
            <Plus size={16} /> {t('nuovo')}
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6">
          {/* LEFT: activity list + events (narrower) */}
          <div className="space-y-4">
            {todayGymSession && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Dumbbell size={12} /> {t('gt_scheda_oggi')}
                </h2>
                <button
                  onClick={() => setGymDialog(todayGymSession)}
                  className="relative w-full rounded-xl border border-border overflow-hidden bg-black p-3 flex items-center justify-between"
                >
                  <div className="absolute inset-0">
                    <Image src={GYM_IMAGE_URL} alt="Gym" fittingType="fill" className="w-full h-full" />
                  </div>
                  <div className="relative flex items-center gap-2 min-w-0 bg-black/60 backdrop-blur-sm -m-3 p-3 w-full flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <Dumbbell size={14} className="shrink-0 text-muted-foreground" />
                      <span className="text-xs font-medium truncate">{todayGymSession.title || t('gsc_allenamento')}</span>
                    </div>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{(todayGymSession.exercises || []).length} ex</span>
                  </div>
                </button>
              </section>
            )}

            {activeActivities.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ag_le_tue')}</h2>
                <div className="space-y-1.5">
                  {activeActivities.map((a) => {
                    const r = ratingFor(a.id);
                    return (
                      <ActivityCardBg key={a.id} activity={a}>
                        <button onClick={() => navigate(`/attivita/${a.id}`)} className="w-full p-3 flex items-center justify-between">
                          <span className="text-xs font-medium truncate text-left">{a.name}</span>
                          {r != null && <span className="shrink-0 text-[10px] text-muted-foreground">{t('ag_oggi')} {r}/5</span>}
                        </button>
                      </ActivityCardBg>
                    );
                  })}
                </div>
              </section>
            )}

            {['todo', 'project', 'weekly', 'one_time', 'meeting', 'deadline'].map((type) => {
              const items = byType(type);
              if (items.length === 0) return null;
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              return (
                <section key={type}>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Icon size={12} /> {t(meta.key)}
                  </h2>
                  <div className="space-y-1.5">{items.map(renderTask)}</div>
                </section>
              );
            })}

            {bookDeadlines.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BookOpen size={12} /> {t('ag_book_deadlines')}
                </h2>
                <div className="space-y-1.5">
                  {bookDeadlines.map((b) => (
                    <div key={b.id} className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                        {b.cover_url ? <img src={b.cover_url} alt="" className="w-full h-full object-cover" /> : <BookOpen size={14} className="text-emerald-400" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{b.title}</p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">{new Date(b.target_date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {upcomingVerifiche.length > 0 && (
              <section>
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CalendarCheck size={12} /> {t('ag_verifiche')}
                </h2>
                <div className="space-y-1.5">
                  {upcomingVerifiche.map((v) => (
                    <div key={v.id} className="rounded-xl border border-border bg-card p-2.5 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                        <CalendarCheck size={14} className="text-purple-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium truncate">{v.subject}</p>
                        {v.topic && <p className="text-[10px] text-muted-foreground truncate">{v.topic}</p>}
                        <p className="text-[9px] text-muted-foreground mt-0.5 capitalize">{new Date(v.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {activeActivities.length === 0 && activeTasks.length === 0 && (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-xs text-muted-foreground mb-3">{t('ag_vuota')}</p>
                <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background">
                  <Plus size={14} /> {t('aggiungi')}
                </button>
              </div>
            )}
          </div>

          {/* RIGHT: focus time + calendar */}
          <div className="space-y-4">
            <FocusTimeCard />
            <div className="rounded-2xl border border-border bg-card p-4">
              <AgendaCalendarView />
            </div>
          </div>
        </div>
      </div>

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaveTask} />
      <TaskRatingPrompt task={rateTask} onClose={() => setRateTask(null)} onRate={handleRate} />
      <GymSessionDialog session={gymDialog} onClose={() => setGymDialog(null)} />
    </div>
  );
}