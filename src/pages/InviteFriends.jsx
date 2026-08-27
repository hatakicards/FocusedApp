import { useState, useEffect } from 'react';
import { Users, Copy, Check, Gift, TrendingUp, Share2, ChevronLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { useUserSettings, useInvalidateAll } from '@/lib/useAppData';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { toast } from '@/components/ui/use-toast';

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function InviteFriends() {
  const { user } = useAuth();
  const { data: settings } = useUserSettings();
  const invalidate = useInvalidateAll();
  const navigate = useNavigate();
  const t = useT();
  const [copied, setCopied] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const referralCode = settings?.referral_code;
  const credits = settings?.credits || 0;
  const premiumMonths = settings?.referral_premium_months || 0;
  const progressPct = (credits % 50) / 50 * 100;
  const creditsToNext = 50 - (credits % 50);

  const referralLink = referralCode
    ? `${window.location.origin}/?ref=${referralCode}`
    : '';

  // Generate referral code if not exists
  useEffect(() => {
    if (settings && !settings.referral_code && !generating) {
      setGenerating(true);
      const code = generateReferralCode();
      getDB().UserSettings.update(settings.id, { referral_code: code })
        .then(() => invalidate())
        .catch(console.error)
        .finally(() => setGenerating(false));
    }
  }, [settings, generating]);

  // Fetch referrals
  useEffect(() => {
    if (user) {
      getDB().Referral.filter({ referrer_id: user.id }, '-created_date', 100)
        .then(setReferrals)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [user]);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // Fallback
      const input = document.createElement('input');
      input.value = referralLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    const shareData = {
      title: 'Focused',
      text: t('invite_share_text'),
      url: referralLink,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        handleCopy();
      }
    } catch (e) {
      // User cancelled or not supported
    }
  };

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center gap-2">
        <button onClick={() => navigate('/profilo')} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={22} />
        </button>
        <Users size={22} className="text-emerald-500" />
        <h1 className="text-2xl font-bold tracking-tight">{t('invite_title')}</h1>
      </header>

      {/* Credits summary */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-emerald-500" />
            <span className="text-sm font-semibold">{t('invite_credits')}</span>
          </div>
          <span className="text-2xl font-bold tabular-nums">{credits}</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden mb-2">
          <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">
          {t('invite_progress').replace('{n}', creditsToNext)}
        </p>
        {premiumMonths > 0 && (
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
            <Sparkles size={12} />
            <span>{t('invite_premium_earned').replace('{n}', premiumMonths)}</span>
          </div>
        )}
      </div>

      {/* Referral link */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('invite_link')}</p>
        {referralLink ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground truncate">
                {referralLink}
              </div>
              <button
                onClick={handleCopy}
                className={`rounded-xl px-3 py-2.5 text-xs font-semibold transition-colors ${
                  copied ? 'bg-emerald-500 text-white' : 'bg-foreground text-background'
                }`}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
            <button
              onClick={handleShare}
              className="mt-2 w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Share2 size={14} /> {t('invite_share')}
            </button>
          </>
        ) : (
          <div className="h-10 rounded-xl bg-muted animate-pulse" />
        )}
      </div>

      {/* How it works */}
      <div className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={16} className="text-emerald-500" />
          <span className="text-sm font-semibold">{t('invite_rules')}</span>
        </div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-500">1</span>
            <p className="text-xs text-muted-foreground">{t('invite_rule_1')}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-500">2</span>
            <p className="text-xs text-muted-foreground">{t('invite_rule_2')}</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="shrink-0 w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center text-[10px] font-bold text-amber-500">3</span>
            <p className="text-xs text-muted-foreground">{t('invite_rule_3')}</p>
          </div>
        </div>
      </div>

      {/* Referrals list */}
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('invite_referrals')}</p>
      {loading ? (
        <div className="h-20 rounded-xl bg-muted animate-pulse" />
      ) : referrals.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t('invite_no_referrals')}</p>
      ) : (
        <div className="space-y-2">
          {referrals.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
              <div>
                <p className="text-sm font-medium">{r.invitee_email || t('invite_anon')}</p>
                <p className="text-xs text-muted-foreground">
                  {r.spent_euros > 0 ? `${r.spent_euros.toFixed(0)}€ · ` : ''}
                  {r.credits_earned || 0} {t('invite_credits')}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                r.spent_euros > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-muted text-muted-foreground'
              }`}>
                {r.spent_euros > 0 ? t('invite_status_paying') : t('invite_status_signup')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}