import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { Bell, HeartPulse, Hourglass, Check, Timer, ListChecks, Target } from 'lucide-react';
import { getDB } from '@/lib/guestDB';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { useUserSettings } from '@/lib/useAppData';
import { requestNotificationPermission } from '@/lib/dailyReminder';
import { isSenseAvailable, enableSense } from '@/lib/healthSense';
import { isScreenTimeSupported, getAuthorizationStatus, requestAuthorization } from '@/lib/nativeScreenTime';
import { TUTORIALS } from '@/lib/tutorials';
import SpotlightTour from './SpotlightTour';

export const FIRST_RUN_KEY = 'first_run_pending';

const todayStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const SUGGESTIONS = [
  { key: 'fr_s_train', category: 'fitness' },
  { key: 'fr_s_study', category: 'apprendimento' },
  { key: 'fr_s_read', category: 'apprendimento' },
  { key: 'fr_s_med', category: 'mente' },
];

const shell = 'pointer-events-auto fixed inset-0 z-[90] flex flex-col bg-black text-white';

function Card({ icon: Icon, title, text, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35 }}
      className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6"
    >
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10">
        <Icon size={30} strokeWidth={1.6} />
      </div>
      <h2 className="mb-2 text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mb-6 text-sm leading-relaxed text-white/60">{text}</p>
      {children}
    </motion.div>
  );
}
// Primo avvio dopo il login: arrivo animato, permessi spiegati uno per uno, giro
// dell'app con i punti illuminati, poi si crea insieme la prima attivita', il primo
// obiettivo, il primo task in agenda e si lancia il primo Focus Time.
export default function FirstRunFlow({ onDone }) {
  const t = useT();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const [perms, setPerms] = useState(null); // elenco permessi da chiedere su questo dispositivo
  const [stage, setStage] = useState('arrival');
  const [permIdx, setPermIdx] = useState(0);
  const [busy, setBusy] = useState(false);

  // activity
  const [actName, setActName] = useState('');
  const [actCategory, setActCategory] = useState('custom');
  const [activity, setActivity] = useState(null);
  // goal
  const [goalTitle, setGoalTitle] = useState('');
  const [goalFrame, setGoalFrame] = useState('daily');
  // task
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDay, setTaskDay] = useState(0);
  const [taskTime, setTaskTime] = useState('18:00');
  // focus
  const [focusMin, setFocusMin] = useState(10);

  const name = (user?.full_name || '').trim().split(' ')[0];
  const dream = (settings?.dream || '').trim();

  useEffect(() => {
    (async () => {
      const list = ['notifications'];
      if (await isSenseAvailable()) list.push('health');
      if (isScreenTimeSupported() && (await getAuthorizationStatus()) !== 'unsupported') list.push('screentime');
      setPerms(list);
    })();
  }, []);

  // Dopo questo giro i tutorial a comparsa per pagina non servono piu'.
  const finish = () => {
    try {
      Object.keys(TUTORIALS).forEach((id) => localStorage.setItem(`tutorial_seen_${id}`, '1'));
      localStorage.removeItem(FIRST_RUN_KEY);
    } catch { /* ignore */ }
    onDone?.();
  };

  // Arrivo: parte da solo dopo qualche secondo, o al tocco.
  useEffect(() => {
    if (stage !== 'arrival') return undefined;
    const id = setTimeout(() => setStage('perms'), 4200);
    return () => clearTimeout(id);
  }, [stage]);

  const permMeta = {
    notifications: { icon: Bell, title: 'fr_perm_notif_t', text: 'fr_perm_notif_d', run: requestNotificationPermission },
    health: { icon: HeartPulse, title: 'fr_perm_health_t', text: 'fr_perm_health_d', run: enableSense },
    screentime: { icon: Hourglass, title: 'fr_perm_st_t', text: 'fr_perm_st_d', run: async () => { if ((await getAuthorizationStatus()) !== 'authorized') await requestAuthorization(); } },
  };

  const handlePerm = async () => {
    if (busy) return;
    setBusy(true);
    // Sul browser il permesso notifiche a volte non risponde mai: non si resta bloccati qui.
    const limit = new Promise((resolve) => setTimeout(resolve, Capacitor.isNativePlatform() ? 90000 : 4000));
    try { await Promise.race([permMeta[perms[permIdx]].run(), limit]); } catch { /* il rifiuto non blocca il percorso */ }
    setBusy(false);
    if (permIdx + 1 < perms.length) setPermIdx(permIdx + 1);
    else setStage('tour');
  };

  const createActivity = async () => {
    if (!actName.trim() || busy) return;
    setBusy(true);
    try {
      const a = await getDB().Activity.create({ name: actName.trim(), category: actCategory, emoji: 'star' });
      setActivity(a);
      qc.invalidateQueries({ queryKey: ['activities'] });
      setGoalTitle(`${actName.trim()} - ${t('fr_daily').toLowerCase()}`);
    } catch (e) { console.error(e); }
    setBusy(false);
    setStage('goal');
  };

  const createGoal = async () => {
    if (!goalTitle.trim() || busy) return;
    setBusy(true);
    try {
      if (activity?.id) {
        await getDB().Goal.create({ activity_id: activity.id, title: goalTitle.trim(), timeframe: goalFrame, difficulty: 'easy' });
        qc.invalidateQueries({ queryKey: ['goals'] });
      }
    } catch (e) { console.error(e); }
    setBusy(false);
    setStage('task');
  };

  const createTask = async () => {
    if (!taskTitle.trim() || busy) return;
    setBusy(true);
    try {
      await getDB().TaskItem.create({
        title: taskTitle.trim(), type: 'todo', due_date: todayStr(taskDay), due_time: taskTime || undefined, status: 'active',
      });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    } catch (e) { console.error(e); }
    setBusy(false);
    setStage('focus');
  };

  const startFocus = () => {
    finish();
    navigate('/focus', { state: { autoStartMinutes: focusMin } });
  };

  const steps = useMemo(() => ['arrival', 'perms', 'tour', 'activity', 'goal', 'task', 'focus'], []);
  const guidedIdx = steps.indexOf(stage) - 2; // 0 = tour
  const dots = stage !== 'arrival' && stage !== 'perms' && stage !== 'tour';

  const primary = 'w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-40';
  const chip = (on) => `rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors ${on ? 'bg-white text-black' : 'border border-white/20 text-white/70'}`;
  const input = 'w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-white/30 focus:border-white/50';

  let body = null;

  if (stage === 'arrival') {
    body = (
      <motion.button
        key="arrival" onClick={() => setStage('perms')}
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-8 text-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="absolute h-56 w-56 rounded-full border border-white/20"
            initial={{ scale: 0.4, opacity: 0.7 }}
            animate={{ scale: 3.2, opacity: 0 }}
            transition={{ duration: 3, delay: 0.4 + i * 0.7, repeat: Infinity, ease: 'easeOut' }}
          />
        ))}
        <motion.img
          src="/images/logo_senza_sfondo_x_video.png" alt=""
          className="relative h-28 w-28 object-contain"
          initial={{ scale: 0.3, opacity: 0, rotate: -12 }} animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 120, damping: 12, delay: 0.1 }}
        />
        <motion.h1
          className="relative mt-8 text-3xl font-bold tracking-tight"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.6 }}
        >
          {name ? t('fr_hello').replace('{name}', name) : t('fr_hello_anon')}
        </motion.h1>
        {dream && (
          <motion.div
            className="relative mt-6 max-w-xs"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8, duration: 0.8 }}
          >
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-widest text-white/40">{t('fr_dream_line')}</p>
            <p className="text-lg font-medium leading-snug">{'“'}{dream}{'”'}</p>
          </motion.div>
        )}
        <motion.p
          className="absolute bottom-12 text-xs text-white/40"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }}
        >
          {t('fr_tap')}
        </motion.p>
      </motion.button>
    );
  } else if (stage === 'perms') {
    if (!perms) {
      body = <div key="perms-wait" className="flex-1" />;
    } else {
      const meta = permMeta[perms[permIdx]];
      body = (
        <Card key={`perm-${permIdx}`} icon={meta.icon} title={t(meta.title)} text={t(meta.text)}>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">
            {t('fr_step_of').replace('{a}', String(permIdx + 1)).replace('{b}', String(perms.length))}
          </p>
          <button onClick={handlePerm} disabled={busy} className={primary}>{t('fr_continue')}</button>
        </Card>
      );
    }
  } else if (stage === 'tour') {
    body = <SpotlightTour key="tour" onDone={() => setStage('activity')} />;
  } else if (stage === 'activity') {
    body = (
      <Card key={stage} icon={ListChecks} title={t('fr_act_t')} text={t('fr_act_d')}>
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s.key} onClick={() => { setActName(t(s.key)); setActCategory(s.category); }} className={chip(actName === t(s.key))}>
              {t(s.key)}
            </button>
          ))}
        </div>
        <input value={actName} onChange={(e) => { setActName(e.target.value); setActCategory('custom'); }} placeholder={t('fr_act_ph')} className={`${input} mb-4`} />
        <button onClick={createActivity} disabled={!actName.trim() || busy} className={primary}>{busy ? t('fr_saving') : t('fr_continue')}</button>
      </Card>
    );
  } else if (stage === 'goal') {
    body = (
      <Card key={stage} icon={Target} title={t('fr_goal_t')} text={t('fr_goal_d')}>
        <input value={goalTitle} onChange={(e) => setGoalTitle(e.target.value)} placeholder={t('fr_goal_ph')} className={`${input} mb-3`} />
        <div className="mb-4 flex gap-2">
          <button onClick={() => setGoalFrame('daily')} className={chip(goalFrame === 'daily')}>{t('fr_daily')}</button>
          <button onClick={() => setGoalFrame('weekly')} className={chip(goalFrame === 'weekly')}>{t('fr_weekly')}</button>
        </div>
        <button onClick={createGoal} disabled={!goalTitle.trim() || busy} className={primary}>{busy ? t('fr_saving') : t('fr_continue')}</button>
      </Card>
    );
  } else if (stage === 'task') {
    body = (
      <Card key={stage} icon={Check} title={t('fr_task_t')} text={t('fr_task_d')}>
        <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={t('fr_task_ph')} className={`${input} mb-3`} />
        <div className="mb-3 flex items-center gap-2">
          <button onClick={() => setTaskDay(0)} className={chip(taskDay === 0)}>{t('fr_today')}</button>
          <button onClick={() => setTaskDay(1)} className={chip(taskDay === 1)}>{t('fr_tomorrow')}</button>
          <span className="ml-2 text-xs text-white/50">{t('fr_at')}</span>
          <input type="time" value={taskTime} onChange={(e) => setTaskTime(e.target.value)} className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs [color-scheme:dark]" />
        </div>
        <button onClick={createTask} disabled={!taskTitle.trim() || busy} className={`${primary} mt-1`}>{busy ? t('fr_saving') : t('fr_continue')}</button>
      </Card>
    );
  } else if (stage === 'focus') {
    body = (
      <Card key={stage} icon={Timer} title={t('fr_focus_t')} text={t('fr_focus_d')}>
        <div className="mb-4 flex gap-2">
          {[10, 25, 45].map((m) => (
            <button key={m} onClick={() => setFocusMin(m)} className={chip(focusMin === m)}>{m} {t('fr_min')}</button>
          ))}
        </div>
        <button onClick={startFocus} className={primary}>{t('fr_focus_go')}</button>
        <button onClick={finish} className="mt-3 w-full py-2 text-xs text-white/40">{t('fr_skip')}</button>
      </Card>
    );
  }

  // Durante il giro l'app sotto deve restare visibile: niente fondo nero.
  if (stage === 'tour') return createPortal(<div className="pointer-events-auto fixed inset-0 z-[90]">{body}</div>, document.body);

  return createPortal(
    <div className={shell}>
      {dots && (
        <div className="flex items-center justify-between px-6 safe-top pb-2">
          <div className="flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={`h-1 rounded-full transition-all ${i <= guidedIdx - 1 ? 'w-6 bg-white' : 'w-3 bg-white/20'}`} />
            ))}
          </div>
          <button onClick={finish} className="text-xs text-white/40">{t('fr_skip')}</button>
        </div>
      )}
      <AnimatePresence mode="wait">{body}</AnimatePresence>
    </div>,
    document.body
  );
}
