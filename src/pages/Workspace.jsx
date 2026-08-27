import { useState, useEffect } from 'react';
import { Briefcase, Clock, Users as UsersIcon, Trash2, Pencil, Wallet, Target, TrendingUp, Plus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useWorkDayLogs, useUserSettings, useInvalidateAll, useOptimisticWorkDayLog, useOptimisticEntityDelete, useOptimisticSettingsUpdate, useSubscription } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import RatingPicker from '@/components/RatingPicker';
import EarningsChart from '@/components/EarningsChart';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TutorialDialog from '@/components/TutorialDialog';
import WorkspaceUpcoming from '@/components/WorkspaceUpcoming';
import WorkspaceAddItem from '@/components/WorkspaceAddItem';
import ProjectsList from '@/components/workspace/ProjectsList';
import ProjectPlanner from '@/components/workspace/ProjectPlanner';
import SubscriptionGate from '@/components/SubscriptionGate';

const CURRENCY = '€';

function monthKey(dateStr) {
  return dateStr.substring(0, 7); // YYYY-MM
}

function formatMoney(n) {
  const val = (n || 0).toFixed(0);
  return `${val} ${CURRENCY}`;
}

export default function Workspace() {
  const { data: logs } = useWorkDayLogs();
  const { data: settings } = useUserSettings();
  const invalidate = useInvalidateAll();
  const optimisticSave = useOptimisticWorkDayLog();
  const optimisticDeleteLog = useOptimisticEntityDelete('WorkDayLog', 'workDayLogs');
  const optimisticSettingsUpdate = useOptimisticSettingsUpdate();
  const t = useT();
  const { locale } = useI18n();
  const sub = useSubscription();
  const today = todayISO();
  const currentMonth = monthKey(today);
  const prevMonthDate = new Date();
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonth = prevMonthDate.toISOString().substring(0, 7);

  const todayLog = (logs || []).find((l) => l.date === today);
  const [hours, setHours] = useState('');
  const [meetings, setMeetings] = useState('');
  const [earnings, setEarnings] = useState('');
  const [rating, setRating] = useState(0);
  const [saving, setSaving] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [goalDialog, setGoalDialog] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [tab, setTab] = useState('giornata');
  const [plannerOpen, setPlannerOpen] = useState(false);

  useEffect(() => {
    if (todayLog) {
      setHours(todayLog.work_hours?.toString() || '');
      setMeetings(todayLog.meetings_count?.toString() || '');
      setEarnings(todayLog.earnings != null ? todayLog.earnings.toString() : '');
      setRating(todayLog.work_rating || 0);
    }
  }, [todayLog]);

  if (!sub.canUseProfiles) {
    return <SubscriptionGate title={t('nav_personal')} description={t('gate_personal_desc')} icon={Briefcase} />;
  }

  const monthlyGoal = settings?.monthly_earnings_goal || 0;

  const sorted = [...(logs || [])].sort((a, b) => b.date.localeCompare(a.date));

  const weekLogs = (logs || []).filter((l) => {
    const d = new Date(l.date + 'T00:00:00');
    const diff = (new Date() - d) / 86400000;
    return diff >= 0 && diff < 7;
  });
  const weekHours = weekLogs.reduce((s, l) => s + (l.work_hours || 0), 0);
  const weekMeetings = weekLogs.reduce((s, l) => s + (l.meetings_count || 0), 0);
  const weekEarnings = weekLogs.reduce((s, l) => s + (l.earnings || 0), 0);
  const avgRating = weekLogs.length
    ? (weekLogs.reduce((s, l) => s + (l.work_rating || 0), 0) / weekLogs.length).toFixed(1)
    : '–';

  // Current month earnings
  const monthLogs = (logs || []).filter((l) => monthKey(l.date) === currentMonth);
  const monthEarned = monthLogs.reduce((s, l) => s + (l.earnings || 0), 0);
  const monthProgress = monthlyGoal > 0 ? Math.min(100, (monthEarned / monthlyGoal) * 100) : 0;
  const monthRemaining = Math.max(0, monthlyGoal - monthEarned);

  // Previous month recap
  const prevMonthLogs = (logs || []).filter((l) => monthKey(l.date) === prevMonth);
  const prevMonthEarned = prevMonthLogs.reduce((s, l) => s + (l.earnings || 0), 0);
  const showPrevRecap = prevMonthLogs.length > 0 && prevMonthEarned > 0;

  const hoursChart = [...(logs || [])]
    .filter((l) => l.work_hours)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((l) => ({
      date: new Date(l.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      ore: l.work_hours,
    }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        date: today,
        work_hours: hours ? parseFloat(hours) : 0,
        meetings_count: meetings ? parseInt(meetings) : 0,
        work_rating: rating,
        earnings: earnings ? parseFloat(earnings) : 0,
      };
      await optimisticSave(todayLog, payload);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editLog) return;
    setSaving(true);
    try {
      await optimisticSave(editLog, {
        work_hours: editLog.work_hours || 0,
        meetings_count: editLog.meetings_count || 0,
        work_rating: editLog.work_rating || 0,
        earnings: editLog.earnings || 0,
      });
      setEditLog(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id) => {
    optimisticDeleteLog(id).catch(console.error);
  };

  const handleSaveGoal = async () => {
    if (!settings) return;
    setGoalDialog(false);
    await optimisticSettingsUpdate(settings.id, {
      monthly_earnings_goal: goalInput ? parseFloat(goalInput) : 0,
    });
  };

  const openGoalDialog = () => {
    setGoalInput(monthlyGoal ? monthlyGoal.toString() : '');
    setGoalDialog(true);
  };

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Briefcase size={22} className="text-emerald-500" />
          <h1 className="text-2xl font-bold tracking-tight">{t('ws_titolo')}</h1>
        </div>
        <button
          onClick={() => (tab === 'progetti' ? setPlannerOpen(true) : setAddItemOpen(true))}
          className="flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background active:scale-95 transition-all"
        >
          <Plus size={16} /> {tab === 'progetti' ? t('ws_new_project') : t('aggiungi')}
        </button>
      </header>

      <div className="flex gap-2 mb-6">
        {['giornata', 'progetti'].map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`rounded-xl px-4 py-2 text-xs font-semibold border transition-colors ${tab === tabKey ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
          >
            {t('ws_tab_' + tabKey)}
          </button>
        ))}
      </div>

      {tab === 'progetti' && (
        <ProjectsList onNewProject={() => setPlannerOpen(true)} />
      )}

      {tab === 'giornata' && (
      <>
      <WorkspaceUpcoming />

      {/* Monthly goal / progress */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        {monthlyGoal > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold">{t('ws_goal_mese')}</span>
              </div>
              <button onClick={openGoalDialog} className="text-xs text-muted-foreground hover:text-foreground">
                {t('ws_modifica_goal')}
              </button>
            </div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-2xl font-bold tabular-nums">{formatMoney(monthEarned)}</p>
                <p className="text-[10px] text-muted-foreground">{t('ws_guadagnato_mese')}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-muted-foreground tabular-nums">{formatMoney(monthlyGoal)}</p>
                <p className="text-[10px] text-muted-foreground">{t('ws_recap_obiettivo')}</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${monthProgress}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {monthRemaining > 0
                ? t('ws_mancano').replace('{n}', formatMoney(monthRemaining))
                : t('ws_obiettivo_ok')}
            </p>
          </>
        ) : (
          <button onClick={openGoalDialog} className="w-full flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Target size={18} className="text-emerald-500" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">{t('ws_imposta_goal')}</p>
              <p className="text-xs text-muted-foreground">{t('ws_goal_mese_ph')}</p>
            </div>
          </button>
        )}
      </div>

      {/* Previous month recap */}
      {showPrevRecap && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-emerald-500" />
            <span className="text-sm font-semibold">{t('ws_recap_mese')}</span>
            <span className="text-xs text-muted-foreground ml-auto">
              {new Date(prevMonth + '-01T00:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('ws_recap_guadagnato')}</p>
              <p className="text-lg font-bold tabular-nums">{formatMoney(prevMonthEarned)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('ws_recap_obiettivo')}</p>
              <p className="text-lg font-bold tabular-nums">{formatMoney(monthlyGoal)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('ws_recap_diff')}</p>
              <p className={`text-lg font-bold tabular-nums ${prevMonthEarned >= monthlyGoal ? 'text-emerald-500' : 'text-destructive'}`}>
                {prevMonthEarned >= monthlyGoal ? '+' : ''}{formatMoney(prevMonthEarned - monthlyGoal)}
              </p>
            </div>
          </div>
          <p className="text-xs text-center mt-3 font-medium">
            {prevMonthEarned >= monthlyGoal
              ? t('ws_recap_superato').replace('{n}', formatMoney(prevMonthEarned - monthlyGoal))
              : t('ws_recap_mancato').replace('{n}', formatMoney(monthlyGoal - prevMonthEarned))}
          </p>
        </div>
      )}

      {/* Today's input */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('bf_oggi')}</p>
        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-muted-foreground shrink-0" />
            <input
              type="number"
              inputMode="decimal"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder={t('ws_ore_ph')}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-2">
            <UsersIcon size={16} className="text-muted-foreground shrink-0" />
            <input
              type="number"
              inputMode="numeric"
              value={meetings}
              onChange={(e) => setMeetings(e.target.value)}
              placeholder={t('ws_riunioni_ph')}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Wallet size={16} className="text-emerald-500 shrink-0" />
            <input
              type="number"
              inputMode="decimal"
              value={earnings}
              onChange={(e) => setEarnings(e.target.value)}
              placeholder={t('ws_guadagno_ph')}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground mb-2">{t('ws_voto_lavoro')}</p>
        <div className="flex justify-center mb-3">
          <RatingPicker value={rating} onChange={setRating} />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {saving ? t('salvataggio') : t('salva')}
        </button>
      </div>

      {/* Weekly stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Clock size={14} className="mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold tabular-nums">{weekHours.toFixed(1)}</p>
          <p className="text-[10px] text-muted-foreground">{t('ws_ore_sett')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <UsersIcon size={14} className="mx-auto text-muted-foreground mb-1" />
          <p className="text-lg font-bold tabular-nums">{weekMeetings}</p>
          <p className="text-[10px] text-muted-foreground">{t('ws_riunioni_sett')}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 text-center">
          <Wallet size={14} className="mx-auto text-emerald-500 mb-1" />
          <p className="text-lg font-bold tabular-nums">{formatMoney(weekEarnings)}</p>
          <p className="text-[10px] text-muted-foreground">{t('ws_earn_andamento')}</p>
        </div>
      </div>

      {/* Earnings chart (this month) */}
      <EarningsChart logs={monthLogs} goal={monthlyGoal} locale={locale} />

      {/* Hours chart */}
      {hoursChart.length >= 2 && (
        <div className="rounded-2xl border border-border bg-card p-4 mb-6">
          <p className="text-xs font-semibold mb-3">{t('ws_andamento')}</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={hoursChart}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} />
              <Tooltip
                contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'hsl(0 0% 45%)' }}
              />
              <Bar dataKey="ore" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* History */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('storico')}</p>
      {sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('nessun_dato')}</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium capitalize">{new Date(l.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                <p className="text-xs text-muted-foreground">
                  {l.work_hours || 0}h · {l.meetings_count || 0} riunioni · {l.work_rating || '–'}/5
                  {l.earnings ? ` · ${formatMoney(l.earnings)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setEditLog(l)} className="text-muted-foreground hover:text-foreground">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(l.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editLog} onOpenChange={(v) => !v && setEditLog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('modifica')}</DialogTitle>
          </DialogHeader>
          {editLog && (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground capitalize">{new Date(editLog.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={editLog.work_hours || ''}
                  onChange={(e) => setEditLog({ ...editLog, work_hours: e.target.value ? parseFloat(e.target.value) : 0 })}
                  placeholder={t('ws_ore_ph')}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-2">
                <UsersIcon size={16} className="text-muted-foreground shrink-0" />
                <input
                  type="number"
                  inputMode="numeric"
                  value={editLog.meetings_count || ''}
                  onChange={(e) => setEditLog({ ...editLog, meetings_count: e.target.value ? parseInt(e.target.value) : 0 })}
                  placeholder={t('ws_riunioni_ph')}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Wallet size={16} className="text-emerald-500 shrink-0" />
                <input
                  type="number"
                  inputMode="decimal"
                  value={editLog.earnings || ''}
                  onChange={(e) => setEditLog({ ...editLog, earnings: e.target.value ? parseFloat(e.target.value) : 0 })}
                  placeholder={t('ws_guadagno_ph')}
                  className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                />
              </div>
              <p className="text-xs text-muted-foreground">{t('ws_voto_lavoro')}</p>
              <div className="flex justify-center">
                <RatingPicker
                  value={editLog.work_rating || 0}
                  onChange={(v) => setEditLog({ ...editLog, work_rating: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setEditLog(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
              {t('annulla')}
            </button>
            <button onClick={handleEditSave} disabled={saving} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40">
              {saving ? t('salvataggio') : t('salva')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Goal dialog */}
      <Dialog open={goalDialog} onOpenChange={(v) => !v && setGoalDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('ws_goal_mese')}</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground">{t('ws_recap_nuovo')}</p>
            <div className="flex items-center gap-2">
              <Target size={16} className="text-emerald-500 shrink-0" />
              <input
                type="number"
                inputMode="decimal"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                placeholder={t('ws_goal_mese_ph')}
                className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
          </div>
          <DialogFooter>
            <button onClick={() => setGoalDialog(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
              {t('annulla')}
            </button>
            <button onClick={handleSaveGoal} disabled={saving} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40">
              {saving ? t('salvataggio') : t('salva')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </>
      )}

      <WorkspaceAddItem open={addItemOpen} onClose={() => setAddItemOpen(false)} />
      <ProjectPlanner open={plannerOpen} onClose={() => setPlannerOpen(false)} />
      <TutorialDialog pageId="workspace" />
    </div>
  );
}