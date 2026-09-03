import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Gift, Users, TrendingUp, Crown, Wallet, Mail } from 'lucide-react';

const ADMIN_EMAIL = 'danimandurinz2010@gmail.com';
const TABS = [
  { id: 'promo', label: 'Promo' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'purchases', label: 'Acquisti' },
];

function fmtDate(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtMoney(cents, currency) {
  const amount = (cents || 0) / 100;
  return amount.toLocaleString('it-IT', { style: 'currency', currency: (currency || 'eur').toUpperCase() });
}

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState('promo');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.email !== ADMIN_EMAIL) {
      setError('Accesso negato');
      return;
    }
    base44.functions.invoke('admin-data', {})
      .then((res) => setData(res.data))
      .catch((e) => setError(e.message || 'Errore caricamento'));
  }, [user]);

  if (!user) return null;

  return (
    <div className="px-5 safe-top pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Admin</h1>
      </div>

      {error && <p className="text-sm text-destructive text-center mt-10">{error}</p>}

      {!error && !data && (
        <div className="flex justify-center mt-10">
          <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      )}

      {!error && data && (
        <>
          <div className="flex gap-1 p-1 rounded-xl bg-muted mb-6 w-fit">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  tab === t.id ? 'bg-foreground text-background' : 'text-muted-foreground'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'promo' && <PromoTab promoUsage={data.promoUsage} />}
          {tab === 'analytics' && <AnalyticsTab analytics={data.analytics} />}
          {tab === 'purchases' && <PurchasesTab purchases={data.purchases} />}
        </>
      )}
    </div>
  );
}

function PromoTab({ promoUsage }) {
  const byCode = promoUsage.reduce((acc, r) => {
    const key = r.code || 'Sconosciuto';
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});
  const codes = Object.entries(byCode).sort((a, b) => b[1].length - a[1].length);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Gift size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Codici unici</span>
          </div>
          <p className="text-2xl font-black">{codes.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Utilizzi totali</span>
          </div>
          <p className="text-2xl font-black">{promoUsage.length}</p>
        </div>
      </div>

      {codes.map(([code, records]) => (
        <div key={code} className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold tracking-wide uppercase">{code}</span>
            <span className="text-xs text-muted-foreground">{records.length} utilizzi</span>
          </div>
          <div className="space-y-2">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={12} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{r.user_email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r.reward_type === 'lifetime_premium' && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold">LIFE</span>
                  )}
                  <span className="text-muted-foreground">{fmtDate(r.created_date)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {promoUsage.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-10">Nessun utilizzo di codice promo registrato.</p>
      )}
    </div>
  );
}

function AnalyticsTab({ analytics }) {
  return (
    <div>
      <div className="rounded-3xl border border-border bg-card p-6 mb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users size={18} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Utenti registrati</span>
        </div>
        <p className="text-5xl font-black mb-1">{analytics.totalUsers}</p>
        <p className="text-xs text-muted-foreground">account creati in totale</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nuovi (7gg)</span>
          </div>
          <p className="text-2xl font-black">{analytics.newLast7d}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Login attivi (7gg)</span>
          </div>
          <p className="text-2xl font-black">{analytics.activeLast7d}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <h3 className="text-sm font-bold mb-3">Ultimi registrati</h3>
        <div className="space-y-2">
          {analytics.recentSignups.map((u) => (
            <div key={u.email} className="flex items-center justify-between text-xs">
              <span className="truncate">{u.email}</span>
              <div className="flex items-center gap-2 shrink-0 ml-2 text-muted-foreground">
                <span>{fmtDate(u.createdAt)}</span>
                {u.lastSignInAt && <span className="text-[9px] opacity-60">ultimo login {fmtDate(u.lastSignInAt)}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="text-[11px] text-muted-foreground">
          Visite pagina e tempo di utilizzo non sono ancora tracciati lato server — richiede o collegare l'API di Google Analytics (già installato sul sito) o costruire un log di sessioni dedicato. Da fare come miglioria successiva.
        </p>
      </div>
    </div>
  );
}

function PurchasesTab({ purchases }) {
  const { premiumUsers, revenue, activeSubscriptions } = purchases;

  return (
    <div>
      <div className="rounded-3xl border border-border bg-card p-6 mb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Wallet size={18} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Incassato (Stripe, netto)</span>
        </div>
        <p className="text-5xl font-black mb-1">{fmtMoney(revenue.totalNetCents, revenue.currency)}</p>
        <p className="text-xs text-muted-foreground">
          {revenue.error ? `Errore Stripe: ${revenue.error}` : `ultime ${revenue.transactionCount} transazioni`}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Crown size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Premium/Pro ora</span>
          </div>
          <p className="text-2xl font-black">{premiumUsers.length}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Wallet size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Abbonamenti Stripe attivi</span>
          </div>
          <p className="text-2xl font-black">{activeSubscriptions.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <h3 className="text-sm font-bold mb-3">Chi ha premium/pro adesso</h3>
        <div className="space-y-2">
          {premiumUsers.map((u) => (
            <div key={u.email} className="flex items-center justify-between text-xs">
              <span className="truncate">{u.email}</span>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {u.trialActive && <span className="rounded-full bg-blue-500/15 text-blue-400 px-2 py-0.5 text-[9px] font-semibold">TRIAL</span>}
                {u.promoUntil && new Date(u.promoUntil) > new Date() && <span className="rounded-full bg-emerald-500/15 text-emerald-400 px-2 py-0.5 text-[9px] font-semibold">PROMO</span>}
                {u.stripeSubscriptionId && <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[9px] font-semibold">STRIPE</span>}
                <span className="text-muted-foreground uppercase">{u.tier}</span>
              </div>
            </div>
          ))}
          {premiumUsers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">Nessuno ha premium/pro al momento.</p>
          )}
        </div>
      </div>

      {activeSubscriptions.length > 0 && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <h3 className="text-sm font-bold mb-3">Abbonamenti Stripe attivi</h3>
          <div className="space-y-2">
            {activeSubscriptions.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="truncate">{s.customerEmail || 'N/A'}</span>
                <span className="text-muted-foreground shrink-0 ml-2">
                  {fmtMoney(s.amount, s.currency)} / {s.interval}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
