import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, CalendarClock, Repeat, Timer, Circle, Dumbbell, CalendarCheck, Users, Clock, BookOpen, Trash2 } from 'lucide-react';
import {
  useActivities, useRatings, useTasks, useGymSessions, useUserSettings, useInvalidateAll, useVerifiche,
  useOptimisticTaskSave, useOptimisticTaskToggle, useOptimisticTaskRate, useOptimisticTaskArchive,
  useBooks,
} from '@/lib/useAppData';
import GymSessionDialog from '@/components/gym/GymSessionDialog';
import TutorialDialog from '@/components/TutorialDialog';
import HelpButton from '@/components/HelpButton';
import { useI18n, useT, weekdayShortByMonSun } from '@/lib/i18n';
import { computeTaskStreak } from '@/lib/productivity';
import { getDB } from '@/lib/guestDB';
import { useOptimisticRemove } from '@/lib/optimisticHelpers';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import PullToRefresh from '@/components/PullToRefresh';
import TaskForm from '@/components/TaskForm';
import OrganizeCalendar from '@/components/organize/OrganizeCalendar';
import TaskRatingPrompt from '@/components/TaskRatingPrompt';
import { useTaskCelebration } from '@/components/CompletionCelebration';
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

export default function Agenda() {
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
  const removeTask = useOptimisticRemove('TaskItem', 'tasks');
  const { locale } = useI18n();
  const t = useT();

  const [formOpen, setFormOpen] = useState(false);
  const [rateTask, setRateTask] = useState(null);
  const [gymDialog, setGymDialog] = useState(null);
  const [deleteTask, setDeleteTask] = useState(null);

  const { data: tasks, isLoading: loadingTasks } = useTasks();
  const { celebrate, celebrationElement } = useTaskCelebration();

  const celebrateDone = (task, rating) => {
    const day = task.completed_date || new Date().toISOString().split('T')[0];
    celebrate({ title: task.title, rating: rating || 0, streak: computeTaskStreak(tasks, day) });
  };

  const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayGymSession = settings?.gym_enabled
    ? (gymSessions || []).find((s) => s.day_of_week === WEEKDAY_IDS[new Date().getDay()])
    : null;

  const activeActivities = (activities || []).filter((a) => !a.archived && !a.is_gym && !a.preset_type);
  // Le attivita' settimanali non finiscono mai: restano in lista anche dopo averle spuntate (sono
  // "fatte" solo per il giorno in cui le hai completate), cosi' tornano la settimana dopo.
  const todayIso = new Date().toISOString().split('T')[0];
  const activeTasks = (tasks || []).filter((t) => t.status === 'active' || (t.type === 'weekly' && t.status === 'done'));
  const doneToday = (task) => task.status === 'done' && (task.type !== 'weekly' || task.completed_date === todayIso);
  const upcomingVerifiche = (verifiche || []).filter((v) => v.status === 'scheduled').sort((a, b) => a.date.localeCompare(b.date));
  const bookDeadlines = (books || []).filter((b) => b.status === 'reading' && b.target_date).sort((a, b) => a.target_date.localeCompare(b.target_date));
  const now = new Date();

  const isExpired = (task) => task.type === 'project' && task.expiry_date && new Date(task.expiry_date) < now;

  const handleToggle = async (task) => {
    // Una settimanale completata un altro giorno si completa di nuovo oggi, non si "riapre".
    const current = task.type === 'weekly' && task.status === 'done' && !doneToday(task) ? { ...task, status: 'active' } : task;
    const updated = await optimisticTaskToggle(current);
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
      } catch (e) {
        console.error(e);
      }
    }
    celebrateDone(rateTask, rating);
    setRateTask(null);
  };

  const handleSkipRate = () => {
    if (rateTask) celebrateDone(rateTask, 0);
    setRateTask(null);
  };

  const handleArchive = (task) => {
    optimisticTaskArchive(task).catch(console.error);
  };

  const confirmDelete = async () => {
    const task = deleteTask;
    setDeleteTask(null);
    if (task) await removeTask(task.id);
  };

  const handleSaveTask = async (payload) => {
    await optimisticTaskSave(payload);
  };

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
      <div key={task.id} className="rounded-2xl border border-border/70 bg-card px-4 py-3.5 flex items-center gap-3">
        <button
          onClick={() => handleToggle(task)}
          className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${doneToday(task) ? 'bg-foreground border-foreground' : 'border-border'}`}
        >
          {doneToday(task) && <Check size={14} className="text-background" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{task.title}</span>
            {expired && <span className="shrink-0 text-[10px] text-destructive font-semibold">{t('ag_scaduto')}</span>}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
            <Icon size={11} /> {t(meta.key)}
            {task.due_date && <> · {fmtDate(task.due_date)}</>}
            {task.due_time && <> · {task.due_time}{task.end_time ? `–${task.end_time}` : ''}</>}
            {task.expiry_date && <> · {t('ag_scad')} {fmtDate(task.expiry_date)}</>}
            {task.type === 'weekly' && task.weekdays?.length > 0 && <> · {task.weekdays.map((d) => weekdayShortByMonSun(locale, d)).join(' ')}</>}
            {task.rating != null && <> · {task.rating}/5</>}
            {task.linked_activity_id && <> · {t('ag_collegata')}</>}
          </div>
        </div>
        {expired && (
          <button onClick={() => handleArchive(task)} className="shrink-0 text-[10px] font-medium text-muted-foreground px-2 py-1 rounded-lg bg-foreground/5">
            {t('ag_archivia')}
          </button>
        )}
        <button
          onClick={() => setDeleteTask(task)}
          aria-label={t('elimina')}
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground active:bg-foreground/10"
        >
          <Trash2 size={15} />
        </button>
      </div>
    );
  };

  // Dentro ogni gruppo: prima per data, poi per orario (le cose senza data in fondo).
  const byWhen = (a, b) => `${a.due_date || '9999'} ${a.due_time || '99:99'}`.localeCompare(`${b.due_date || '9999'} ${b.due_time || '99:99'}`);
  const byType = (type) => activeTasks.filter((task) => task.type === type).sort(byWhen);

  return (
    <PullToRefresh onRefresh={invalidate}>
      <div className="mx-auto max-w-3xl px-5 safe-top pb-4">
        <header className="mb-5 flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium capitalize text-muted-foreground">{now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <h1 className="text-3xl font-bold tracking-tight">{t('nav_agenda')}</h1>
          </div>
          <HelpButton pageId="agenda" className="mr-2 ml-auto" />
          <button
            onClick={() => setFormOpen(true)}
            aria-label={t('nuovo')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background active:scale-95"
          >
            <Plus size={20} />
          </button>
        </header>

        <OrganizeCalendar
          onToggle={handleToggle}
          onArchive={handleArchive}
          onDelete={setDeleteTask}
          onSaveTask={handleSaveTask}
          listView={(
            <div>
        {todayGymSession && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Dumbbell size={12} /> {t('gt_scheda_oggi')}
            </h2>
            <button
              onClick={() => setGymDialog(todayGymSession)}
              className="relative w-full rounded-2xl border border-border overflow-hidden bg-black p-4 flex items-center justify-between"
            >
              <div className="absolute inset-0">
                <Image src={GYM_IMAGE_URL} alt="Gym" fittingType="fill" className="w-full h-full" />
              </div>
              <div className="relative flex items-center gap-2 min-w-0 bg-black/60 backdrop-blur-sm -m-4 p-4 w-full flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Dumbbell size={16} className="shrink-0 text-muted-foreground" />
                  <span className="text-sm font-medium truncate">{todayGymSession.title || t('gsc_allenamento')}</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{(todayGymSession.exercises || []).length} ex</span>
              </div>
            </button>
          </section>
        )}

        {activeActivities.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ag_le_tue')}</h2>
            <div className="space-y-2">
              {activeActivities.map((a) => {
                const r = ratingFor(a.id);
                return (
                  <ActivityCardBg key={a.id} activity={a}>
                    <button
                      onClick={() => navigate(`/attivita/${a.id}`)}
                      className="w-full p-4 flex items-center justify-between"
                    >
                      <span className="text-sm font-medium truncate text-left">{a.name}</span>
                      {r != null && <span className="shrink-0 text-xs text-muted-foreground">{t('ag_oggi')} {r}/5</span>}
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
            <section key={type} className="mb-7">
              <h2 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                <Icon size={12} /> {t(meta.key)} <span className="rounded-full bg-foreground/10 px-1.5 py-0.5 text-[10px] tabular-nums">{items.length}</span>
              </h2>
              <div className="space-y-2">{items.map(renderTask)}</div>
            </section>
          );
        })}

        {bookDeadlines.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen size={12} /> {t('ag_book_deadlines')}
            </h2>
            <div className="space-y-2">
              {bookDeadlines.map((b) => (
                <div key={b.id} className="rounded-2xl border border-border bg-card p-3 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {b.cover_url ? (
                      <img src={b.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen size={16} className="text-emerald-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{b.title}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{new Date(b.target_date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {upcomingVerifiche.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <CalendarCheck size={12} /> {t('ag_verifiche')}
          </h2>
          <div className="space-y-2">
            {upcomingVerifiche.map((v) => (
              <div key={v.id} className="rounded-2xl border border-border bg-card p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                  <CalendarCheck size={16} className="text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{v.subject}</p>
                  {v.topic && <p className="text-xs text-muted-foreground truncate">{v.topic}</p>}
                  <p className="text-[10px] text-muted-foreground mt-0.5 capitalize">{new Date(v.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeActivities.length === 0 && activeTasks.length === 0 && !loadingTasks && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <p className="text-sm text-muted-foreground mb-4">{t('ag_vuota')}</p>
            <button onClick={() => setFormOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">
              <Plus size={16} /> {t('aggiungi')}
            </button>
          </div>
        )}

            </div>
          )}
        />

        <TaskForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={handleSaveTask} />

        <Dialog open={!!deleteTask} onOpenChange={(o) => !o && setDeleteTask(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="pr-6 leading-snug">{t('ag_elimina_q')}</DialogTitle>
              <DialogDescription>
                {deleteTask?.title}{deleteTask?.type === 'weekly' ? ` - ${t('ag_elimina_weekly')}` : ''}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-2 flex gap-2">
              <button onClick={() => setDeleteTask(null)} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold">{t('annulla')}</button>
              <button onClick={confirmDelete} className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-semibold text-destructive-foreground">{t('elimina')}</button>
            </div>
          </DialogContent>
        </Dialog>

        <TaskRatingPrompt task={rateTask} onClose={handleSkipRate} onRate={handleRate} />
        {celebrationElement}

        <GymSessionDialog session={gymDialog} onClose={() => setGymDialog(null)} />
        <TutorialDialog pageId="agenda" />
      </div>
    </PullToRefresh>
  );
}