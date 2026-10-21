import { useState, useEffect } from 'react';
import { Briefcase, Users as UsersIcon, Trash2, Pencil, Wallet, Target, TrendingUp, Plus, Clock, Check } from 'lucide-react';
import { useWorkDayLogs, useUserSettings, useOptimisticWorkDayLog, useOptimisticEntityDelete, useOptimisticSettingsUpdate, useSubscription } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
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

// Projects & Businesses: da una parte l'attivita' (quanto hai guadagnato, scadenze e
// riunioni, andamento dei guadagni), dall'altra i progetti (ancora in beta).
export default function Workspace() {
  const { data: logs } = useWorkDayLogs();
  const { data: settings } = useUserSettings();
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
  const [earnings, setEarnings] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editLog, setEditLog] = useState(null);
  const [goalDialog, setGoalDialog] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  const [addItemType, setAddItemType] = useState(null); // 'riunione' | 'scadenza'
  const [tab, setTab] = useState('giornata');
  const [plannerOpen, setPlannerOpen] = useState(false);

  useEffect(() => {
    if (todayLog) setEarnings(todayLog.earnings != null ? todayLog.earnings.toString() : '');
  }, [todayLog]);

  if (!sub.canUseProfiles) {
    return <SubscriptionGate title={t('nav_personal')} description={t('gate_personal_desc')} icon={Briefcase} />;
  }

  const monthlyGoal = settings?.monthly_earnings_goal || 0;
  const sorted = [...(logs || [])].filter((l) => l.earnings).sort((a, b) => b.date.localeCompare(a.date));

  const monthLogs = (logs || []).filter((l) => monthKey(l.date) === currentMonth);
  const monthEarned = monthLogs.reduce((s, l) => s + (l.earnings || 0), 0);
  const monthProgress = monthlyGoal > 0 ? Math.min(100, (monthEarned / monthlyGoal) * 100) : 0;
  const monthRemaining = Math.max(0, monthlyGoal - monthEarned);

  const prevMonthLogs = (logs || []).filter((l) => monthKey(l.date) === prevMonth);
  const prevMonthEarned = prevMonthLogs.reduce((s, l) => s + (l.earnings || 0), 0);
  const showPrevRecap = prevMonthLogs.length > 0 && prevMonthEarned > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      await optimisticSave(todayLog, { date: today, earnings: earnings ? parseFloat(earnings) : 0 });
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async () => {
    if (!editLog) return;
    setSaving(true);
    try {
      await optimisticSave(editLog, { earnings: editLog.earnings || 0 });
      setEditLog(null);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!settings) return;
    setGoalDialog(false);
    await optimisticSettingsUpdate(settings.id, { monthly_earnings_goal: goalInput ? parseFloat(goalInput) : 0 });
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
          <h1 className="text-2xl font-bold tracking-tight">{t('personal_projects')}</h1>
        </div>
        {tab === 'progetti' && (
          <button
            onClick={() => setPlannerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-foreground px-3 py-2 text-sm font-semibold text-background active:scale-95 transition-all"
          >
            <Plus size={16} /> {t('ws_new_project')}
          </button>
        )}
      </header>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setTab('giornata')}
          className={`rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${tab === 'giornata' ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}
        >
          Businesses
        </button>
        <button
          onClick={() => setTab('progetti')}
          className={`flex items-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-semibold transition-colors ${tab === 'progetti' ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}
        >
          Projects
          <span className={`rounded px-1 py-px text-[9px] font-bold tracking-wider ${tab === 'progetti' ? 'bg-background text-foreground' : 'bg-foreground/10'}`}>BETA</span>
        </button>
      </div>

      {tab === 'progetti' && <ProjectsList onNewProject={() => setPlannerOpen(true)} />}

      {tab === 'giornata' && (
        <>
          {/* Quanto hai fatto oggi */}
          <div className="mb-3 rounded-2xl border border-border bg-card p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('ws_oggi_quanto')}</p>
            <div className="flex items-center gap-2">
              <Wallet size={16} className="shrink-0 text-emerald-500" />
              <input
                type="number"
                inputMode="decimal"
                value={earnings}
                onChange={(e) => setEarnings(e.target.value)}
                placeholder={t('ws_guadagno_ph')}
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="shrink-0 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40"
              >
                {saved ? <Check size={16} /> : saving ? '...' : t('opt_salva')}
              </button>
            </div>
          </div>

          {/* Aggiungi scadenza / riunione */}
          <div className="mb-6 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => setAddItemType('scadenza')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 text-center active:scale-[0.98] transition-transform"
            >
              <Clock size={20} className="text-amber-400" />
              <span className="text-xs font-semibold">{t('ws_add_deadline')}</span>
            </button>
            <button
              onClick={() => setAddItemType('riunione')}
              className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-card px-3 py-4 text-center active:scale-[0.98] transition-transform"
            >
              <UsersIcon size={20} className="text-blue-400" />
              <span className="text-xs font-semibold">{t('ws_add_meeting')}</span>
            </button>
          </div>

          {/* Andamento dei guadagni */}
          <EarningsChart logs={monthLogs} goal={monthlyGoal} locale={locale} />

          <WorkspaceUpcoming />

          {/* Obiettivo mensile */}
          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            {monthlyGoal > 0 ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target size={16} className="text-emerald-500" />
                    <span className="text-sm font-semibold">{t('ws_goal_mese')}</span>
                  </div>
                  <button onClick={openGoalDialog} className="text-xs text-muted-foreground hover:text-foreground">{t('ws_modifica_goal')}</button>
                </div>
                <div className="mb-2 flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-bold tabular-nums">{formatMoney(monthEarned)}</p>
                    <p className="text-[10px] text-muted-foreground">{t('ws_guadagnato_mese')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium tabular-nums text-muted-foreground">{formatMoney(monthlyGoal)}</p>
                    <p className="text-[10px] text-muted-foreground">{t('ws_recap_obiettivo')}</p>
                  </div>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${monthProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground">
                  {monthRemaining > 0 ? t('ws_mancano').replace('{n}', formatMoney(monthRemaining)) : t('ws_obiettivo_ok')}
                </p>
              </>
            ) : (
              <button onClick={openGoalDialog} className="flex w-full items-center gap-3 py-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                  <Target size={18} className="text-emerald-500" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold">{t('ws_imposta_goal')}</p>
                  <p className="text-xs text-muted-foreground">{t('ws_goal_mese_ph')}</p>
                </div>
              </button>
            )}
          </div>

          {showPrevRecap && (
            <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="mb-3 flex items-center gap-2">
                <TrendingUp size={16} className="text-emerald-500" />
                <span className="text-sm font-semibold">{t('ws_recap_mese')}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {new Date(prevMonth + '-01T00:00:00').toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t('ws_recap_guadagnato')}</p>
                  <p className="text-lg font-bold tabular-nums">{formatMoney(prevMonthEarned)}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t('ws_recap_obiettivo')}</p>
                  <p className="text-lg font-bold tabular-nums">{formatMoney(monthlyGoal)}</p>
                </div>
                <div>
                  <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">{t('ws_recap_diff')}</p>
                  <p className={`text-lg font-bold tabular-nums ${prevMonthEarned >= monthlyGoal ? 'text-emerald-500' : 'text-destructive'}`}>
                    {prevMonthEarned >= monthlyGoal ? '+' : ''}{formatMoney(prevMonthEarned - monthlyGoal)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Storico guadagni */}
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('storico')}</p>
          {sorted.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t('nessun_dato')}</p>
          ) : (
            <div className="space-y-2">
              {sorted.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{new Date(l.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                    <p className="text-xs tabular-nums text-muted-foreground">{formatMoney(l.earnings)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setEditLog(l)} className="text-muted-foreground hover:text-foreground"><Pencil size={16} /></button>
                    <button onClick={() => optimisticDeleteLog(l.id).catch(console.error)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <Dialog open={!!editLog} onOpenChange={(v) => !v && setEditLog(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('modifica')}</DialogTitle></DialogHeader>
              {editLog && (
                <div className="space-y-3 py-2">
                  <p className="text-sm capitalize text-muted-foreground">{new Date(editLog.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <div className="flex items-center gap-2">
                    <Wallet size={16} className="shrink-0 text-emerald-500" />
                    <input
                      type="number"
                      inputMode="decimal"
                      value={editLog.earnings || ''}
                      onChange={(e) => setEditLog({ ...editLog, earnings: e.target.value ? parseFloat(e.target.value) : 0 })}
                      placeholder={t('ws_guadagno_ph')}
                      className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <button onClick={() => setEditLog(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">{t('annulla')}</button>
                <button onClick={handleEditSave} disabled={saving} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40">
                  {saving ? t('salvataggio') : t('opt_salva')}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={goalDialog} onOpenChange={(v) => !v && setGoalDialog(false)}>
            <DialogContent>
              <DialogHeader><DialogTitle>{t('ws_goal_mese')}</DialogTitle></DialogHeader>
              <div className="space-y-2 py-2">
                <p className="text-sm text-muted-foreground">{t('ws_recap_nuovo')}</p>
                <div className="flex items-center gap-2">
                  <Target size={16} className="shrink-0 text-emerald-500" />
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
                <button onClick={() => setGoalDialog(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">{t('annulla')}</button>
                <button onClick={handleSaveGoal} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background">{t('opt_salva')}</button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      <WorkspaceAddItem open={!!addItemType} defaultType={addItemType || 'riunione'} onClose={() => setAddItemType(null)} />
      <ProjectPlanner open={plannerOpen} onClose={() => setPlannerOpen(false)} />
      <TutorialDialog pageId="workspace" />
    </div>
  );
}
