import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { ArrowLeft, Users, TrendingUp, Calendar } from 'lucide-react';

export default function AdminAnalytics() {
  const { user } = useAuth();
  const [totalUsers, setTotalUsers] = useState(null);
  const [recentUsers, setRecentUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      setError('Accesso negato');
      return;
    }
    // Count all users — each User record = 1 unique person who used the app
    base44.entities.User.list('-created_date', 500)
      .then((users) => {
        setTotalUsers(users.length);
        setRecentUsers(users.slice(0, 10));
      })
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
          <h1 className="text-lg font-bold">Analytics</h1>
        </div>
        <p className="text-sm text-destructive text-center mt-10">{error}</p>
      </div>
    );
  }

  if (totalUsers === null) {
    return (
      <div className="px-5 safe-top pb-4">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => window.history.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold">Analytics</h1>
        </div>
        <div className="flex justify-center mt-10">
          <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newThisWeek = recentUsers.filter(
    (u) => u.created_date && new Date(u.created_date) >= sevenDaysAgo
  ).length;

  return (
    <div className="px-5 safe-top pb-10">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => window.history.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold">Analytics</h1>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6 mb-4 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Users size={18} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Persone che hanno usato l'app
          </span>
        </div>
        <p className="text-5xl font-black mb-1">{totalUsers}</p>
        <p className="text-xs text-muted-foreground">Utenti unici registrati</p>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Nuovi (7gg)
            </span>
          </div>
          <p className="text-2xl font-black">{newThisWeek}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={16} className="text-muted-foreground" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ultimi 10
            </span>
          </div>
          <p className="text-2xl font-black">{recentUsers.length}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-bold mb-3">Utenti più recenti</h3>
        <div className="space-y-2">
          {recentUsers.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-xs">
              <span className="truncate">{u.email || u.full_name || 'N/A'}</span>
              <span className="text-muted-foreground shrink-0 ml-2">
                {u.created_date ? new Date(u.created_date).toLocaleDateString('it-IT') : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}