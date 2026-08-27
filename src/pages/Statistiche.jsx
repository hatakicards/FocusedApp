import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart3 } from 'lucide-react';
import { useLifeStats, useUserSettings, useSubscription, useOptimisticLifeStatSave } from '@/lib/useAppData';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useT } from '@/lib/i18n';
import { getLifeStatsForProfile, defaultScores } from '@/lib/statsConfig';
import StatSliders from '@/components/stats/StatSliders';
import StatRadarChart from '@/components/stats/StatRadarChart';
import TutorialDialog from '@/components/TutorialDialog';

export default function Statistiche() {
  const { data: lifeStats, isLoading } = useLifeStats();
  const { data: settings } = useUserSettings();
  const navigate = useNavigate();
  const t = useT();
  const sub = useSubscription();
  const optimisticLifeStatSave = useOptimisticLifeStatSave();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState(defaultScores());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!sub.canUseLifeStats) {
    return <SubscriptionGate title={t('stat_titolo')} description={t('gate_stats_desc')} icon={BarChart3} />;
  }

  const profileType = settings?.profile_type || 'base';
  const stats = getLifeStatsForProfile(profileType);

  const list = lifeStats || [];
  const hasAnyStats = list.length > 0;
  const baseline =
    list.find((s) => s.is_baseline) ||
    [...list].sort((a, b) => (a.created_date || '').localeCompare(b.created_date || ''))[0] ||
    null;
  const current = [...list].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))[0] || null;

  const totalBaseline = baseline ? stats.reduce((sum, c) => sum + (baseline[c.id] ?? 0), 0) : 0;
  const totalCurrent = current ? stats.reduce((sum, c) => sum + (current[c.id] ?? 0), 0) : 0;
  const totalDelta = totalCurrent - totalBaseline;

  const startEdit = () => {
    const init = defaultScores();
    stats.forEach((s) => (init[s.id] = current?.[s.id] ?? 5));
    setValues(init);
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const existing = (lifeStats || []).find((s) => s.date === today && !s.is_baseline);
      await optimisticLifeStatSave(existing || null, values, !hasAnyStats);
      setEditing(false);
    } catch (e) {
      setError(t('errore_salvataggio') || 'Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // No life stats at all → show baseline setup directly
  if (!hasAnyStats && !editing) {
    return (
      <div className="px-5 safe-top pb-4">
        <header className="mb-4 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{t('stat_titolo')}</h1>
        </header>
        <div className="rounded-2xl border border-border bg-card p-5 mb-6">
          <h2 className="text-sm font-semibold mb-1">{t('ss_titolo')}</h2>
          <p className="text-xs text-muted-foreground mb-4">{t('ss_desc')}</p>
          <StatSliders values={values} onChange={setValues} profileType={profileType} />
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-40"
        >
          {saving ? t('salvataggio') : t('ss_inizia')}
        </button>
      </div>
    );
  }

  if (isLoading && !hasAnyStats) {
    return (
      <div className="px-5 safe-top pb-4">
        <header className="mb-4 flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-2 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={22} />
          </button>
          <h1 className="text-2xl font-bold tracking-tight">{t('stat_titolo')}</h1>
        </header>
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          className="rounded-lg p-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">{t('stat_titolo')}</h1>
      </header>

      {!editing && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('stat_andamento')}</p>
            <StatRadarChart baseline={baseline} current={current} profileType={profileType} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 mb-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('stat_punteggi')}</p>
            {stats.map((s) => {
              const Icon = s.icon;
              const val = current[s.id] ?? 0;
              return (
                <div key={s.id} className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border"
                    style={{ color: s.color }}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{t('stat_' + s.id)}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: s.color }}>
                        {val}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, background: s.color }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 mb-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{t('stat_miglioramento')}</p>
            <p
              className={`text-3xl font-bold tabular-nums ${
                totalDelta > 0 ? 'text-emerald-500' : totalDelta < 0 ? 'text-red-500' : 'text-muted-foreground'
              }`}
            >
              {totalDelta > 0 ? '+' : ''}
              {totalDelta}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t('stat_dal')}</p>
          </div>

          <button
            onClick={startEdit}
            className="w-full rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background"
          >
            {t('stat_aggiorna')}
          </button>
        </>
      )}

      {editing && (
        <div>
          <h2 className="text-sm font-semibold mb-3">{t('stat_aggiorna_t')}</h2>
          <div className="rounded-2xl border border-border bg-card p-5 mb-6">
            <StatSliders values={values} onChange={setValues} profileType={profileType} />
          </div>
          {error && (
            <p className="text-xs text-destructive text-center mb-3">{error}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { setEditing(false); setError(null); }}
              className="flex-1 rounded-xl border border-border py-3.5 text-sm font-semibold text-muted-foreground"
            >
              {t('annulla')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-xl bg-foreground py-3.5 text-sm font-semibold text-background disabled:opacity-40"
            >
              {saving ? t('salvataggio') : t('salva')}
            </button>
          </div>
        </div>
      )}
      <TutorialDialog pageId="statistiche" />
    </div>
  );
}