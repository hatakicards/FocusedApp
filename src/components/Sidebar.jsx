import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, BarChart3, Target, User, ListTodo, Flame, GraduationCap, Briefcase, Lock, Megaphone, Lightbulb, Gift, Activity, Sparkles, Timer, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useUserSettings, useSubscription } from '@/lib/useAppData';
import { useAuth } from '@/lib/AuthContext';
import { LOGO_URL } from '@/lib/constants';
import { Image } from '@/components/ui/image';

const PROFILE_TABS = {
  atleta: { to: '/body-fuel', key: 'body_fuel', icon: Flame },
  studente: { to: '/lezioni', key: 'lezioni', icon: GraduationCap },
  professionista: { to: '/workspace', key: 'workspace', icon: Briefcase },
};

const isTabActive = (pathname, tab) =>
  tab.end ? pathname === tab.to : pathname === tab.to || pathname.startsWith(tab.to + '/');

export default function Sidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const { data: settings } = useUserSettings();
  const sub = useSubscription();
  const { user } = useAuth();
  const profileType = settings?.profile_type || 'base';
  const profileTab = PROFILE_TABS[profileType];

  const tabs = [
    { to: '/home', key: 'oggi', icon: CheckCircle2, end: true },
    { to: '/abitudini', key: 'abitudini', icon: BarChart3, end: false },
    { to: '/agenda', key: 'agenda', icon: ListTodo, end: false },
    { to: '/obiettivi', key: 'obiettivi', icon: Target, end: false },
    { to: '/focusy', key: 'focusy', icon: Sparkles, end: false },
    { to: '/focus', key: 'focus_time', icon: Timer, end: false },
    ...(profileTab ? [{ ...profileTab, end: false }] : []),
  ];

  const extraTabs = [
    { to: '/work-with-us', key: 'work_with_us', icon: Megaphone, end: false },
    { to: '/dream', key: 'dream', icon: Lightbulb, end: false },
    { to: '/invita', key: 'credits', icon: Gift, end: false },
    { to: '/statistiche', key: 'lifestats', icon: Activity, end: false },
  ];

  const adminTabs = user?.role === 'admin' ? [
    { to: '/admin/analytics', key: 'admin_analytics', icon: ShieldCheck, end: false, label: 'Analytics' },
    { to: '/admin/promo-report', key: 'admin_promo', icon: Gift, end: false, label: 'Promo Report' },
  ] : [];

  const renderTab = ({ to, key, icon: Icon, end, label }) => {
    const tab = { to, end };
    const isActive = isTabActive(pathname, tab);
    const isLocked = to === '/obiettivi' && !sub.canUseRankings;
    return (
      <button
        key={to}
        onClick={() => navigate(to)}
        className={cn(
          'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out active:scale-[0.97]',
          isActive
            ? 'bg-foreground text-background'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <div className="relative">
          <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
          {isLocked && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-background">
              <Lock size={8} className="text-muted-foreground" strokeWidth={2.5} />
            </span>
          )}
        </div>
        {label || t('nav_' + key)}
      </button>
    );
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 flex-col border-r border-border bg-background/95 backdrop-blur-xl z-40">
      <div className="px-6 py-6">
        <span className="text-xl font-bold tracking-tight">Focused</span>
      </div>
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto scrollbar-hide">
        {tabs.map(renderTab)}
        <div className="my-2 border-t border-border/50" />
        {extraTabs.map(renderTab)}
        {adminTabs.length > 0 && (
          <>
            <div className="my-2 border-t border-border/50" />
            {adminTabs.map((tab) => renderTab(tab))}
          </>
        )}
      </nav>
      <button
        onClick={() => navigate('/profilo')}
        className={cn(
          'flex items-center gap-3 rounded-xl px-3 py-3 mx-3 mb-3 border transition-all duration-200 ease-out active:scale-[0.97]',
          isTabActive(pathname, { to: '/profilo', end: false })
            ? 'border-foreground/30 bg-foreground/5'
            : 'border-border hover:bg-accent'
        )}
      >
        <div className="w-9 h-9 rounded-full overflow-hidden bg-muted shrink-0">
          <Image src={LOGO_URL} alt="Profile" fittingType="fill" className="w-full h-full" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold truncate">
            {user?.isGuest ? t('guest_logged') : (user?.full_name || user?.email)}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {sub.isPro ? (sub.isPremium ? 'PREMIUM' : 'PRO') : t('nav_profilo')}
          </p>
        </div>
      </button>
    </aside>
  );
}