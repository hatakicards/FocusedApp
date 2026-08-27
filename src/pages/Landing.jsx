import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { safeReturnTo } from '@/lib/authReturnTo';

const COMPUTER_BG = '/images/compiter.png';

export default function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-black">
        <div className="w-8 h-8 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    const returnTo = safeReturnTo();
    return <Navigate to={returnTo} replace />;
  }

  // Preserve returnTo query param for the Welcome flow
  const returnToParam = new URLSearchParams(window.location.search).get('returnTo');
  const welcomeUrl = returnToParam ? `/welcome?returnTo=${encodeURIComponent(returnToParam)}` : '/welcome';

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Desktop/Tablet background */}
      <div className="hidden md:block absolute inset-0">
        <img
          src={COMPUTER_BG}
          alt=""
          draggable={false}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Desktop/Tablet content — right side (black area of background) */}
      <div className="hidden md:flex absolute inset-0 items-center">
        <div className="ml-auto flex flex-col items-start gap-6 pr-12 lg:pr-24 xl:pr-32 max-w-lg w-1/2">
          <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.1] tracking-tight">
            Motivation comes and goes. Focus keeps.
          </h1>
          <p className="text-lg lg:text-xl text-white/60 font-medium">
            Unlock your full potential with Focused
          </p>
          <div className="flex flex-col gap-3 w-full mt-6">
            <button
              onClick={() => navigate(welcomeUrl)}
              className="w-full rounded-xl bg-white text-black py-4 text-base font-bold transition-all active:scale-[0.97]"
            >
              Start for Free!
            </button>
          </div>
        </div>
      </div>

      {/* Mobile content — centered */}
      <div className="md:hidden flex flex-col items-center justify-center min-h-screen px-6 gap-8">
        <div className="flex flex-col items-center gap-5">
          <h1 className="text-3xl font-bold text-center leading-[1.15] tracking-tight">
            Motivation comes and goes. Focus keeps.
          </h1>
          <p className="text-base text-white/60 text-center font-medium">
            Unlock your full potential with Focused
          </p>
        </div>
        <div className="flex flex-col gap-3 w-full max-w-sm">
          <button
            onClick={() => navigate(welcomeUrl)}
            className="w-full rounded-xl bg-white text-black py-4 text-base font-bold transition-all active:scale-[0.97]"
          >
            Start for Free!
          </button>
        </div>
      </div>

      {/* Footer links */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-6 text-sm text-white/40">
        <button onClick={() => navigate('/about')} className="hover:text-white/80 transition-colors">
          About
        </button>
        <button onClick={() => navigate('/contact')} className="hover:text-white/80 transition-colors">
          Contact
        </button>
      </div>
    </div>
  );
}