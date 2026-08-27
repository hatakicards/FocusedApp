import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { ArrowLeft, Gift, Users, Calendar, Mail } from 'lucide-react';

export default function AdminPromoReport() {
  const { user } = useAuth();
  const t = useT();
  const [records, setRecords] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      setError('Accesso negato');
      return;
    }
    base44.entities.PromoCodeUsage.list('-created_date', 500)
      .then(setRecords)
      .catch((e) => setError(e.message || 'Errore caricamento'));
  }, [user]);

  if (!user) return null;

  if (error) {
    return (
      <div className="px-5 safe-top pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.history.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Report Promo Code</h1>
        </div>
        <p className="text-sm text-destructive text-center mt-10">{error}</p>
      </div>
    );
  }

  if (!records) {
    return (
      <div className="px-5 safe-top pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.history.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Report Promo Code</h1>
        </div>
        <div className="flex justify-center mt-10">
          <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const byCode = records.reduce((acc, r) => {
    const key = r.code || 'Sconosciuto';
    if (!acc[key]) acc[key] = { count: 0, users: [] };
    acc[key].count++;
    acc[key].users.push(r);
    return acc;
  }, {});
  const codes = Object.entries(byCode).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="px-5 safe-top pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Report Promo Code</h1>
      </div>

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
          <p className="text-2xl font-black">{records.length}</p>
        </div>
      </div>

      {codes.map(([code, data]) => (
        <div key={code} className="rounded-2xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold tracking-wide uppercase">{code}</span>
            <span className="text-xs text-muted-foreground">{data.count} utilizzi</span>
          </div>
          <div className="space-y-2">
            {data.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail size={12} className="text-muted-foreground shrink-0" />
                  <span className="truncate">{u.user_email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {u.reward_type === 'lifetime_premium' && (
                    <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold">LIFE</span>
                  )}
                  <span className="text-muted-foreground">
                    {u.created_date ? new Date(u.created_date).toLocaleDateString('it-IT') : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {records.length === 0 && (
        <p className="text-sm text-muted-foreground text-center mt-10">Nessun utilizzo di promo code registrato.</p>
      )}
    </div>
  );
}