import { useState } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { AGE_BLOCK_KEY } from '@/lib/ageCheck';

/**
 * Schermata a tutto schermo per chi non ha l'eta' minima. Messaggio neutro (non dice quale eta' serve).
 * - Prima dell'account (benvenuto): solo il messaggio, nessun dato e' stato salvato.
 * - Dentro l'app con account: si puo' eliminare l'account e i dati, oppure uscire.
 * - Ospite: si possono cancellare i dati locali.
 */
export default function AgeBlockedScreen() {
  const t = useT();
  const { user, logout } = useAuth();
  const hasAccount = !!user && !user.isGuest;
  const isGuest = !!user?.isGuest;
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await base44.auth.deleteAccount({ keepKeys: [AGE_BLOCK_KEY] });
      logout();
    } catch (e) {
      console.error('Delete account error:', e);
      setError(`${t('del_error')}${e?.message ? ` (${e.message})` : ''}`);
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm space-y-5 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/5">
          <ShieldAlert size={32} className="text-foreground" />
        </div>
        <h2 className="text-xl font-bold tracking-tight">{t('age_blocked_t')}</h2>
        <p className="text-sm text-muted-foreground">{t('age_blocked_d')}</p>
        {hasAccount && <p className="text-sm text-muted-foreground">{t('age_blocked_acc')}</p>}

        {error && <p className="text-xs text-destructive">{error}</p>}

        {hasAccount && (
          <div className="space-y-2.5">
            <button
              onClick={confirming ? handleDelete : () => setConfirming(true)}
              disabled={deleting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive px-4 py-3 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
            >
              {deleting && <Loader2 size={16} className="animate-spin" />}
              {deleting ? t('profilo_elimina_eliminazione') : confirming ? t('profilo_elimina_def') : t('profilo_elimina')}
            </button>
            <button
              onClick={logout}
              disabled={deleting}
              className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground disabled:opacity-50"
            >
              {t('esci')}
            </button>
          </div>
        )}

        {isGuest && (
          <button
            onClick={logout}
            className="w-full rounded-xl border border-border px-4 py-3 text-sm font-medium text-muted-foreground"
          >
            {t('del_local_btn')}
          </button>
        )}
      </div>
    </div>
  );
}
