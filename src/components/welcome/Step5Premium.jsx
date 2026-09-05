import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Crown, Star, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';

const PERIODS = [
  { id: 'monthly', label: 'Monthly' },
  { id: 'quarterly', label: 'Quarterly' },
  { id: 'annual', label: 'Annual' },
];

const PRICING = {
  premium: {
    monthly: { intro: '2,99', regular: '4,99' },
    quarterly: { intro: '8,99', regular: '12,99' },
    annual: { price: '44,99', monthlyEquiv: '3,75', save: '15' },
  },
  pro: {
    monthly: { intro: '1,99', regular: '3,49' },
    quarterly: { intro: '6,99', regular: '9,99' },
    annual: { price: '29,99', monthlyEquiv: '2,50', save: '12' },
  },
};

const PREMIUM_FEATURES = ['No Ads', 'Athlete Mode', 'Student Mode', 'Professional Mode', 'Life Stats', 'Real-time Rankings', 'Gym Schedule'];
const PRO_FEATURES = ['No Ads', 'Life Stats', 'Real-time Rankings', 'Gym Schedule'];

export default function Step5Premium({ onFinish }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('monthly');
  const [loading, setLoading] = useState(null);

  const handleChoice = async (choice) => {
    setLoading(choice);
    await onFinish(choice);
  };

  const renderPrice = (tier) => {
    const p = PRICING[tier][period];
    if (period === 'annual') {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-black">{p.price}</span>
            <span className="text-xs text-muted-foreground">€/year</span>
          </div>
          <div className="text-[11px] text-muted-foreground">≈ {p.monthlyEquiv} €/month</div>
          <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold">
            SAVE {p.save} €
          </div>
        </div>
      );
    }
    const unit = period === 'monthly' ? 'month' : 'quarter';
    return (
      <div className="flex flex-col items-center gap-0.5">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-black">{p.intro}</span>
          <span className="text-xs text-muted-foreground">€/{unit}</span>
        </div>
        <div className="text-[11px] text-muted-foreground text-center">
          intro, then {p.regular} €/{unit}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-[70vh]">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold tracking-tight mb-1">Find out everything Focused can offer you</h1>
      </div>

      {/* Period selector */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted mb-4">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
              period === p.id ? 'bg-foreground text-background' : 'text-muted-foreground'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Two large boxes */}
      <div className="flex-1 space-y-3">
        {/* Premium box */}
        <div className="rounded-2xl bg-foreground text-background p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Crown size={18} />
              <span className="text-sm font-bold tracking-wide">PREMIUM</span>
            </div>
            <span className="text-[10px] font-semibold bg-background/20 px-2 py-0.5 rounded-full">Full Access</span>
          </div>
          <div className="mb-3">{renderPrice('premium')}</div>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {PREMIUM_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-[11px] font-medium">
                <Check size={12} className="shrink-0" /> {f}
              </div>
            ))}
          </div>
          <button
            onClick={() => handleChoice('premium')}
            disabled={loading !== null}
            className="w-full rounded-xl bg-background py-3 text-sm font-bold text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === 'premium' ? <Loader2 size={16} className="animate-spin" /> : 'Get Premium'}
          </button>
        </div>

        {/* Pro box */}
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Star size={18} />
              <span className="text-sm font-bold tracking-wide">PRO</span>
            </div>
            <span className="text-[10px] font-semibold bg-muted px-2 py-0.5 rounded-full">Base only</span>
          </div>
          <div className="mb-3">{renderPrice('pro')}</div>
          <div className="grid grid-cols-2 gap-1.5 mb-4">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <Check size={12} className="shrink-0 text-foreground" /> {f}
              </div>
            ))}
          </div>
          <button
            onClick={() => handleChoice('pro')}
            disabled={loading !== null}
            className="w-full rounded-xl border border-border bg-background py-3 text-sm font-bold text-foreground disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === 'pro' ? <Loader2 size={16} className="animate-spin" /> : 'Get Pro'}
          </button>
        </div>
      </div>

      {/* No thanks button */}
      <button
        onClick={() => handleChoice('free')}
        disabled={loading !== null}
        className="w-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-3 mt-3 disabled:opacity-50"
      >
        No thanks, keep it free!
      </button>

      <div className="flex items-center justify-center gap-3 mt-1">
        <Link to="/terms" className="text-[11px] text-muted-foreground underline">
          Terms of Use
        </Link>
        <Link to="/privacy" className="text-[11px] text-muted-foreground underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}