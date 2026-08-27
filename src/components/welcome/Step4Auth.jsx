import { useState } from 'react';
import { ArrowLeft, Mail, Lock, Loader2, UserPlus, LogIn } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { setGuestMode } from '@/lib/guestDB';
import GoogleIcon from '@/components/GoogleIcon';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function Step4Auth({ data, onAuthRedirect, onBack }) {
  const [mode, setMode] = useState('register'); // 'register' | 'login'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  const handleGoogle = () => {
    onAuthRedirect();
    setGuestMode(false);
    base44.auth.loginWithProvider('google', '/welcome');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    onAuthRedirect();
    setGuestMode(false);
    try {
      if (mode === 'login') {
        await base44.auth.loginViaEmailPassword(email, password);
        // Preserve query params (returnTo) through the redirect
        window.location.href = '/welcome' + window.location.search;
      } else {
        await base44.auth.register({ email, password });
        setShowOtp(true);
      }
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.access_token) {
        base44.auth.setToken(result.access_token);
      }
      // Hard redirect so auth provider re-initializes; preserve returnTo
      window.location.href = '/welcome' + window.location.search;
    } catch (err) {
      setError(err.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  if (showOtp) {
    return (
      <div className="flex flex-col min-h-[60vh]">
        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Verify your email</h1>
          <p className="text-muted-foreground text-sm mb-8">We sent a code to {email}</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
          )}

          <div className="flex justify-center mb-6">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={loading || otpCode.length < 6}
            className="w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background flex items-center justify-center gap-2 disabled:opacity-30"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'Verify'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[60vh]">
      <div className="flex-1 flex flex-col justify-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {mode === 'register' ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-muted-foreground text-sm mb-8">
          {mode === 'register' ? 'Sign up to start your journey' : 'Log in to continue'}
        </p>

        <button
          onClick={handleGoogle}
          className="w-full rounded-2xl border border-border bg-card py-3.5 text-sm font-semibold flex items-center justify-center gap-2 mb-4 hover:bg-muted transition-colors"
        >
          <GoogleIcon className="w-5 h-5" />
          Continue with Google
        </button>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-3 text-muted-foreground">or</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3.5 text-foreground text-sm font-medium outline-none focus:border-foreground/50 transition-colors"
              required
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3.5 text-foreground text-sm font-medium outline-none focus:border-foreground/50 transition-colors"
              required
            />
          </div>
          {mode === 'register' && (
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm password"
                className="w-full rounded-2xl border border-border bg-card pl-11 pr-4 py-3.5 text-foreground text-sm font-medium outline-none focus:border-foreground/50 transition-colors"
                required
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-foreground py-4 text-sm font-bold text-background flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : mode === 'register' ? (
              <><UserPlus size={18} /> Create account</>
            ) : (
              <><LogIn size={18} /> Log in</>
            )}
          </button>
        </form>

        <button
          onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
          className="w-full text-center text-sm text-muted-foreground mt-4"
        >
          {mode === 'register' ? 'Already have an account? ' : "Don't have an account? "}
          <span className="text-foreground font-semibold">
            {mode === 'register' ? 'Log in' : 'Sign up'}
          </span>
        </button>
      </div>

      <button
        onClick={onBack}
        className="rounded-2xl border border-border px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-2 mt-6"
      >
        <ArrowLeft size={18} /> Back
      </button>
    </div>
  );
}