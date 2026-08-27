import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { safeReturnTo } from '@/lib/authReturnTo';
import { Image } from '@/components/ui/image';
import { LOGO_URL } from '@/lib/constants';
import Step1Name from '@/components/welcome/Step1Name';
import Step2Dream from '@/components/welcome/Step2Dream';
import Step3Reminder from '@/components/welcome/Step3Reminder';
import Step4Auth from '@/components/welcome/Step4Auth';
import Step5Premium from '@/components/welcome/Step5Premium';

const STORAGE_KEY = 'welcome_data';

export default function Welcome() {
  const { isAuthenticated, user, isLoadingAuth } = useAuth();
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
        if (data.name) {
          await base44.auth.updateMe({ full_name: data.name });
        }
        const existing = await getDB().UserSettings.filter({ created_by_id: user.id }, '-created_date', 10);
        const settingsData = {
          birth_date: data.birthDate,
          dream: data.dream,
          reminder_time: data.reminderTime,
          reminder_enabled: data.reminderEnabled,
        };
        if (existing.length > 0) {
          await getDB().UserSettings.update(existing[0].id, settingsData);
        } else {
          await getDB().UserSettings.create(settingsData);
        }
      } catch (e) {
        console.error('Error saving welcome data:', e);
      }
    })();
  }, [step, isAuthenticated, user, data]);

  const updateData = (partial) => setData((prev) => ({ ...prev, ...partial }));

  const handleNext = (newData) => {
    updateData(newData);
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(1, s - 1));

  const handleAuthRedirect = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

    if (choice === 'free') {
      navigate(safeReturnTo(), { replace: true });
      return;
    }

    // Premium or Pro → Stripe checkout
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

  return (
    <div className="min-h-screen bg-background safe-top">
      <div className="flex flex-col items-center px-6 py-8 min-h-screen max-w-md mx-auto">
        {/* Logo */}
        <div className="w-14 h-14 mb-6">
          <Image src={LOGO_URL} alt="Focused" fittingType="fit" className="w-full h-full object-contain" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? 'w-6 bg-foreground'
                  : i < step
                  ? 'w-1.5 bg-foreground/50'
                  : 'w-1.5 bg-foreground/20'
              }`}
            />
          ))}
        </div>

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
            {step === 1 && <Step1Name data={data} onNext={handleNext} />}
            {step === 2 && <Step2Dream data={data} onNext={handleNext} onBack={handleBack} />}
            {step === 3 && <Step3Reminder data={data} onNext={handleNext} onBack={handleBack} />}
            {step === 4 && <Step4Auth data={data} onAuthRedirect={handleAuthRedirect} onBack={handleBack} />}
            {step === 5 && <Step5Premium data={data} onFinish={handleFinish} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}