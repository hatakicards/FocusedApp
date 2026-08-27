import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Loader2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { useInvalidateAll } from '@/lib/useAppData';
import WelcomeToProAnimation from '@/components/WelcomeToProAnimation';

export default function RemoveAdsSuccess() {
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const [status, setStatus] = useState('processing');
  const [tier, setTier] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');
    if (!sessionId) {
      setStatus('error');
      return;
    }
    base44.functions
      .invoke('confirm-remove-ads', { session_id: sessionId })
      .then(async (res) => {
        // Also persist subscription locally (local-only mode reads from localStorage)
        const resolvedTier = res?.data?.tier || res?.tier || 'pro';
        try {
          const local = await getDB().UserSettings.filter({}, '-created_date', 1);
          if (local[0]) {
            await getDB().UserSettings.update(local[0].id, {
              ads_removed: true,
              subscription_tier: resolvedTier,
            });
          }
        } catch (e) { /* local update best-effort */ }
        setStatus('done');
        setTier(resolvedTier === 'premium' ? 'premium' : 'pro');
        invalidate();
      })
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="px-5 safe-top pb-4 min-h-screen flex flex-col items-center justify-center text-center">
      {status === 'processing' && (
        <>
          <Loader2 className="animate-spin mb-4 text-muted-foreground" size={32} />
          <p className="text-sm text-muted-foreground">Conferma del pagamento…</p>
        </>
      )}
      {status === 'done' && (
        <>
          <div className="w-16 h-16 rounded-full bg-foreground text-background flex items-center justify-center mb-4">
            <Check size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2">Annunci rimossi</h1>
          <p className="text-sm text-muted-foreground mb-6">Grazie! L'app è ora senza pubblicità.</p>
          <button
            onClick={() => navigate('/')}
            className="rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background"
          >
            Torna all'app
          </button>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-16 h-16 rounded-full border border-border flex items-center justify-center mb-4 text-muted-foreground">
            <AlertCircle size={32} />
          </div>
          <h1 className="text-xl font-bold mb-2">Qualcosa è andato storto</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Non riusciamo a confermare il pagamento. Se l'addebito è avvenuto, contattaci.
          </p>
          <button
            onClick={() => navigate('/profilo')}
            className="rounded-xl border border-border px-6 py-3 text-sm font-semibold"
          >
            Indietro
          </button>
        </>
      )}
      <WelcomeToProAnimation tier={status === 'done' ? tier : null} onClose={() => setTier(null)} />
    </div>
  );
}