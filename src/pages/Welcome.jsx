import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getDB, unlockGuestSubscription } from '@/lib/guestDB';
import { safeReturnTo } from '@/lib/authReturnTo';
import WelcomeIntro from '@/components/welcome/WelcomeIntro';
import Step4Auth from '@/components/welcome/Step4Auth';
import Step5Premium from '@/components/welcome/Step5Premium';
import { isRevenueCatAvailable, purchaseSubscription } from '@/lib/revenueCat';
import WelcomeToProAnimation from '@/components/WelcomeToProAnimation';

const STORAGE_KEY = 'welcome_data';

export default function Welcome() {
  const { isAuthenticated, user, isLoadingAuth, guestLogin } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    name: '',
    birthDate: '',
    dream: '',
    reminderTime: '21:00',
    reminderEnabled: true,
  });
  const dataSaved = useRef(false);
  const [celebrateTier, setCelebrateTier] = useState(null);

  // On mount / auth change: if returning from auth with saved data, go to step 5
  useEffect(() => {
    if (isLoadingAuth) return;
    if (isAuthenticated) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setData(parsed);
          setStep(5);
        } catch (e) {
          navigate(safeReturnTo(), { replace: true });
        }
      } else {
        // Authenticated user without welcome data → go to app (or returnTo)
        navigate(safeReturnTo(), { replace: true });
      }
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  // Save collected data to UserSettings once user is authenticated and on step 5
  useEffect(() => {
    if (step !== 5 || !isAuthenticated || !user || dataSaved.current) return;
    dataSaved.current = true;
    (async () => {
      try {
        if (data.name && !user.isGuest) {
          await base44.auth.updateMe({ full_name: data.name });
        }
        const existing = await getDB().UserSettings.filter({ created_by_id: user.id }, '-created_date', 10);
        const settingsData = {
          birth_date: data.birthDate || null,
          dream: data.dream,
          reminder_time: data.reminderTime,
          reminder_enabled: data.reminderEnabled,
        };
        if (existing.length > 0) {
          await getDB().UserSettings.update(existing[0].id, settingsData);
        } else {
          // trial_start solo alla primissima creazione del profilo — attiva
          // la prova gratuita di 7 giorni una volta sola per utente.
          await getDB().UserSettings.create({ ...settingsData, trial_start: new Date().toISOString() });
        }
      } catch (e) {
        console.error('Error saving welcome data:', e);
      }
    })();
  }, [step, isAuthenticated, user, data]);

  const updateData = (partial) => setData((prev) => ({ ...prev, ...partial }));

  // Dal login si torna al benvenuto.
  const handleBack = () => setStep(1);

  const handleAuthRedirect = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  };

  // Apple Guideline 5.1.1(v): la registrazione deve essere opzionale, non un
  // prerequisito per comprare — salva i dati come prima di un redirect auth
  // reale cosi' l'effect sopra porta a step 5, ma senza nessun redirect.
  const handleGuestContinue = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    guestLogin();
  };

  const handleFinish = async (choice) => {
    // Set onboarded = true
    try {
      const existing = await getDB().UserSettings.filter({ created_by_id: user?.id }, '-created_date', 10);
      if (existing.length > 0) {
        await getDB().UserSettings.update(existing[0].id, { onboarded: true });
      } else {
        await getDB().UserSettings.create({ ...data, onboarded: true });
      }
    } catch (e) {
      console.error('Error setting onboarded:', e);
    }
    localStorage.removeItem(STORAGE_KEY);
    // Il benvenuto e' fatto. Il primo avvio guidato parte appena si entra nell'app (AppLayout ->
    // FirstRunFlow), a meno che l'utente abbia scelto "Salta il tutorial".
    try {
      localStorage.setItem('welcome_v2_done', '1');
      // Anche chi salta le slide fa il percorso guidato (prima attivita', obiettivo, agenda, focus):
      // e' quello che fa capire come funziona davvero l'app.
      localStorage.setItem('first_run_pending', '1');
    } catch { /* ignore */ }

    if (choice === 'free') {
      navigate(safeReturnTo(), { replace: true });
      return;
    }

    // Premium o Pro: nell'app nativa passa da RevenueCat (IAP Apple/Google),
    // mai da Stripe — su web resta lo Stripe Checkout di sempre.
    if (isRevenueCatAvailable()) {
      try {
        await purchaseSubscription(choice, 'monthly');
        if (user?.isGuest) await unlockGuestSubscription(choice);
        // Festeggia subito con l'acquisto gia' confermato da RevenueCat, poi
        // vai in home quando l'animazione si chiude da sola (non prima, altrimenti
        // lo smontaggio di questa pagina la interromperebbe a meta').
        setCelebrateTier(choice);
      } catch (e) {
        console.error('RevenueCat purchase error', e);
        if (!e.userCancelled) {
          alert(e.message || 'Non è stato possibile completare l\'acquisto. Riprova dal tuo profilo.');
        }
        navigate('/home', { replace: true });
      }
      return;
    }

    if (window.self !== window.top) {
      alert('Checkout works only from a published app.');
      navigate('/home', { replace: true });
      return;
    }
    try {
      const res = await base44.functions.invoke('create-remove-ads-checkout', {
        origin: window.location.origin,
        tier: choice,
        period: 'monthly',
        user_id: user?.id,
      });
      const checkoutUrl = res?.data?.url || res?.url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        alert('Non è stato possibile avviare il pagamento. Riprova dal tuo profilo.');
        navigate('/home', { replace: true });
      }
    } catch (e) {
      console.error('Checkout error:', e);
      alert('Non è stato possibile avviare il pagamento. Riprova dal tuo profilo.');
      navigate('/home', { replace: true });
    }
  };

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  // If authenticated but not yet on step 5 (shouldn't normally happen), redirect
  if (isAuthenticated && step < 5 && !localStorage.getItem(STORAGE_KEY)) {
    return null;
  }

  // Il benvenuto a schermo intero: logo, nome, lingua, sogno, permessi, domande e giro dell'app.
  if (step === 1) {
    return (
      <WelcomeIntro
        initial={data}
        onDone={(d) => { updateData(d); setStep(4); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="flex flex-col items-center px-6 py-8 min-h-screen max-w-md mx-auto">
        {/* Steps */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="flex-1 w-full"
          >
            {step === 4 && <Step4Auth data={data} onAuthRedirect={handleAuthRedirect} onGuest={handleGuestContinue} onBack={handleBack} />}
            {step === 5 && <Step5Premium data={data} onFinish={handleFinish} />}
          </motion.div>
        </AnimatePresence>
      </div>
      <WelcomeToProAnimation
        tier={celebrateTier}
        onClose={() => { setCelebrateTier(null); navigate('/home', { replace: true }); }}
      />
    </div>
  );
}