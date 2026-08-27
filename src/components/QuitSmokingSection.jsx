import { useState, useEffect } from 'react';
import { Cigarette, AlertTriangle, Shield, Pencil } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useSmokingProfiles, useSmokingLogs, useOptimisticSmokingProfileSave, useOptimisticSmokingLogSave } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { estimateAllSubstances } from '@/lib/smokingData';
import { getOrCreateKey, encryptData, decryptData } from '@/lib/smokingCrypto';
import { useAuth } from '@/lib/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import ProductSelector from '@/components/smoking/ProductSelector';

const SUBSTANCE_COLORS = {
  nicotine: '#f97316',
  thc: '#a855f7',
  tar: '#6b7280',
  co: '#ef4444',
};

export default function QuitSmokingSection({ activityId }) {
  const t = useT();
  const { locale } = useI18n();
  const { user } = useAuth();
  const { data: profiles } = useSmokingProfiles();
  const { data: logs } = useSmokingLogs();
  const optimisticProfileSave = useOptimisticSmokingProfileSave();
  const optimisticLogSave = useOptimisticSmokingLogSave();
  const today = todayISO();

  const profile = (profiles || [])[0];
  const todayLog = (logs || []).find((l) => l.date === today);
  const isOnboarded = profile?.onboarded;

  const [cryptoKey, setCryptoKey] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [profileProducts, setProfileProducts] = useState([]);
  const [todayEntries, setTodayEntries] = useState([]);
  const [decryptedLogs, setDecryptedLogs] = useState([]);
  const [saving, setSaving] = useState(false);

  // Get or create E2E encryption key (per-user, stored in localStorage)
  useEffect(() => {
    if (!user?.id) return;
    getOrCreateKey(user.id).then(setCryptoKey).catch(console.error);
  }, [user?.id]);

  // Trigger onboarding if not onboarded (after key is ready)
  useEffect(() => {
    if (profiles && !isOnboarded && !showOnboarding && cryptoKey) setShowOnboarding(true);
  }, [profiles, isOnboarded, showOnboarding, cryptoKey]);

  // Decrypt profile products when profile or key changes
  useEffect(() => {
    if (!cryptoKey || !profile?.encrypted_data) return;
    decryptData(profile.encrypted_data, cryptoKey).then((data) => {
      if (data?.products) setProfileProducts(data.products);
    });
  }, [cryptoKey, profile]);

  // Decrypt today's log entries
  useEffect(() => {
    if (!cryptoKey) return;
    if (!todayLog?.encrypted_data) { setTodayEntries([]); return; }
    decryptData(todayLog.encrypted_data, cryptoKey).then((data) => {
      setTodayEntries(data?.entries || []);
    });
  }, [cryptoKey, todayLog]);

  // Decrypt all logs for chart data
  useEffect(() => {
    if (!cryptoKey || !logs?.length) { setDecryptedLogs([]); return; }
    Promise.all(
      logs.map(async (l) => {
        const decrypted = l.encrypted_data ? await decryptData(l.encrypted_data, cryptoKey) : null;
        return {
          ...l,
          entries: decrypted?.entries || [],
          estimated_nicotine: decrypted?.estimated_nicotine || 0,
          estimated_thc: decrypted?.estimated_thc || 0,
          estimated_tar: decrypted?.estimated_tar || 0,
          estimated_co: decrypted?.estimated_co || 0,
        };
      })
    ).then(setDecryptedLogs);
  }, [cryptoKey, logs]);

  const handleSaveProfile = async () => {
    if (!cryptoKey) return;
    setSaving(true);
    try {
      const products = profileProducts.filter((p) => p.daily_quantity > 0);
      const encrypted = await encryptData({ products }, cryptoKey);
      await optimisticProfileSave(profile, {
        encrypted_data: encrypted,
        onboarded: true,
      });
      setShowOnboarding(false);
      setShowEditProfile(false);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveLog = async () => {
    if (!cryptoKey) return;
    setSaving(true);
    try {
      const entries = todayEntries.filter((e) => e.quantity > 0);
      const substances = estimateAllSubstances(todayEntries);
      const encrypted = await encryptData({
        entries,
        estimated_nicotine: substances.nicotine,
        estimated_thc: substances.thc,
        estimated_tar: substances.tar,
        estimated_co: substances.co,
      }, cryptoKey);
      await optimisticLogSave(todayLog, {
        date: today,
        encrypted_data: encrypted,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDialogClose = (v) => {
    if (!v) {
      setShowOnboarding(false);
      setShowEditProfile(false);
      // Re-decrypt to reset any unsaved changes
      if (cryptoKey && profile?.encrypted_data) {
        decryptData(profile.encrypted_data, cryptoKey).then((data) => {
          setProfileProducts(data?.products || []);
        });
      }
    }
  };

  const todaySubstances = estimateAllSubstances(todayEntries);
  const hasAnySubstance = todaySubstances.nicotine > 0 || todaySubstances.thc > 0 || todaySubstances.tar > 0 || todaySubstances.co > 0;

  const chartData = [...decryptedLogs]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((l) => ({
      date: new Date(l.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
      nicotine: Math.round((l.estimated_nicotine || 0) * 10) / 10,
      thc: Math.round((l.estimated_thc || 0) * 10) / 10,
      tar: Math.round((l.estimated_tar || 0) * 10) / 10,
      co: Math.round((l.estimated_co || 0) * 10) / 10,
    }));

  const substanceItems = [
    { key: 'nicotine', label: t('qs_nicotine'), value: todaySubstances.nicotine, color: SUBSTANCE_COLORS.nicotine },
    { key: 'thc', label: t('qs_thc'), value: todaySubstances.thc, color: SUBSTANCE_COLORS.thc },
    { key: 'tar', label: t('qs_tar'), value: todaySubstances.tar, color: SUBSTANCE_COLORS.tar },
    { key: 'co', label: t('qs_co'), value: todaySubstances.co, color: SUBSTANCE_COLORS.co },
  ].filter((s) => s.value > 0);

  return (
    <>
      {isOnboarded && (
        <>
          <div className="mb-6 rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-orange-500/5">
              <Cigarette size={16} className="text-orange-400" />
              <p className="text-xs font-semibold uppercase tracking-wider text-orange-400/80">{t('qs_today_log')}</p>
            </div>
            <div className="p-4">
              <p className="text-base font-semibold mb-0.5">{t('qs_daily')}</p>
              <p className="text-sm text-muted-foreground mb-0.5">{t('qs_daily_sub')}</p>
              <p className="text-xs text-muted-foreground/70 mb-3">{t('qs_daily_note')}</p>
              <div className="flex items-start gap-2 mb-4 rounded-xl bg-emerald-500/5 border border-emerald-500/10 p-3">
                <Shield size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">{t('qs_privacy')}</p>
              </div>
              <ProductSelector entries={todayEntries} onChange={setTodayEntries} quantityField="quantity" />
              <button
                onClick={handleSaveLog}
                disabled={saving || todayEntries.filter((e) => e.quantity > 0).length === 0}
                className="mt-4 w-full rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                {t('qs_save_log')}
              </button>
              {hasAnySubstance && (
                <div className="mt-4 rounded-xl bg-background p-4">
                  <p className="text-xs text-muted-foreground mb-3 text-center font-medium">{t('qs_substances')}</p>
                  <div className="grid grid-cols-2 gap-3">
                    {substanceItems.map((s) => (
                      <div key={s.key} className="rounded-xl border border-border/50 p-3 text-center">
                        <div className="w-2 h-2 rounded-full mx-auto mb-1.5" style={{ background: s.color }} />
                        <p className="text-[10px] text-muted-foreground mb-0.5">{s.label}</p>
                        <p className="text-xl font-bold tabular-nums" style={{ color: s.color }}>{s.value.toFixed(1)}<span className="text-xs font-normal ml-0.5">{t('qs_mg')}</span></p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-4 text-center">
                <p className="text-sm font-semibold text-emerald-400">{t('qs_never_late')}</p>
              </div>
            </div>
          </div>

          {chartData.length >= 1 && (
            <div className="mb-6 rounded-2xl border border-border bg-card p-4">
              <p className="text-xs font-semibold mb-3 text-muted-foreground">{t('qs_trend_all')}</p>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                    formatter={(value, name) => [`${value} ${t('qs_mg')}`, t('qs_' + name)]}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="nicotine" name={t('qs_nicotine')} stroke={SUBSTANCE_COLORS.nicotine} strokeWidth={2} dot={{ r: 3, fill: SUBSTANCE_COLORS.nicotine }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="thc" name={t('qs_thc')} stroke={SUBSTANCE_COLORS.thc} strokeWidth={2} dot={{ r: 3, fill: SUBSTANCE_COLORS.thc }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="tar" name={t('qs_tar')} stroke={SUBSTANCE_COLORS.tar} strokeWidth={2} dot={{ r: 3, fill: SUBSTANCE_COLORS.tar }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="co" name={t('qs_co')} stroke={SUBSTANCE_COLORS.co} strokeWidth={2} dot={{ r: 3, fill: SUBSTANCE_COLORS.co }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <button
            onClick={() => { setProfileProducts([...profileProducts]); setShowEditProfile(true); }}
            className="mb-6 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors active:opacity-70"
          >
            <Pencil size={12} /> {t('qs_edit_profile')}
          </button>
        </>
      )}

      <Dialog open={showOnboarding || showEditProfile} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cigarette size={18} className="text-orange-400" /> {t('qs_title')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-start gap-2 rounded-xl bg-orange-500/10 border border-orange-500/15 p-3 mb-4">
            <AlertTriangle size={16} className="text-orange-400 shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">{t('qs_warning')}</p>
          </div>
          <p className="text-sm font-semibold mb-0.5">{t('qs_onboarding')}</p>
          <p className="text-sm text-muted-foreground mb-4">{t('qs_onboarding_sub')}</p>
          <ProductSelector entries={profileProducts} onChange={setProfileProducts} quantityField="daily_quantity" />
          <DialogFooter>
            <button
              onClick={handleSaveProfile}
              disabled={saving || profileProducts.filter((p) => p.daily_quantity > 0).length === 0}
              className="rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-background disabled:opacity-40 active:scale-[0.98] transition-transform"
            >
              {t('qs_confirm')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}