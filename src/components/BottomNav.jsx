import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, BarChart3, Target, User, ListTodo, Flame, GraduationCap, Briefcase, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useT } from '@/lib/i18n';
import { useUserSettings, useSubscription } from '@/lib/useAppData';
import AdBanner from './AdBanner';

const PROFILE_TABS = {
  atleta: { to: '/body-fuel', key: 'body_fuel', icon: Flame },
  studente: { to: '/lezioni', key: 'lezioni', icon: GraduationCap },
  professionista: { to: '/workspace', key: 'workspace', icon: Briefcase },
};

const isTabActive = (pathname, tab) =>
  tab.end ? pathname === tab.to : pathname === tab.to || pathname.startsWith(tab.to + '/');

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const t = useT();
  const { data: settings } = useUserSettings();
  const sub = useSubscription();
  const profileType = settings?.profile_type || 'base';

  const profileTab = PROFILE_TABS[profileType];
  const personalTab = profileTab || { to: '/body-fuel', icon: Flame };

  const tabs = [
    { to: '/home', key: 'oggi', icon: CheckCircle2, end: true },
    { to: '/abitudini', key: 'abitudini', icon: BarChart3, end: false },
    { to: '/agenda', key: 'agenda', icon: ListTodo, end: false },
    { to: '/obiettivi', key: 'obiettivi', icon: Target, end: false, locked: !sub.canUseRankings },
    { to: personalTab.to, key: 'personal', icon: personalTab.icon, end: false, locked: !sub.canUseProfiles },
    { to: '/profilo', key: 'profilo', icon: User, end: false },
  ];

  const tabHistory = useRef({});

  useEffect(() => {
    for (const tab of tabs) {
      if (isTabActive(pathname, tab)) {
        tabHistory.current[tab.to] = pathname;
        break;
      }
    }
  }, [pathname]);

  const handleClick = (tab) => {
    if (isTabActive(pathname, tab)) {
      if (pathname !== tab.to) navigate(tab.to);
      else window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const last = tabHistory.current[tab.to];
      navigate(last || tab.to);
    }
  };

  return createPortal(
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
      {!sub.adsRemoved && <AdBanner />}
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        {tabs.map(({ to, key, icon: Icon, end, locked }) => {
          const tab = { to, end };
          const isActive = isTabActive(pathname, tab);
          const isLocked = !!locked;
          return (
            <button
              key={to}
              onClick={() => handleClick(tab)}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1 transition-colors min-w-0',
                isActive ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {isActive && (
                <span className="absolute top-0 h-0.5 w-6 rounded-full bg-foreground" />
              )}
              <div className="relative mt-0.5">
                <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} className="shrink-0" />
                {isLocked && (
                  <span className="absolute -top-1 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-background">
                    <Lock size={8} className="text-muted-foreground" strokeWidth={2.5} />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium tracking-tight truncate max-w-full">{t('nav_' + key)}</span>
            </button>
          );
        })}
      </div>
    </nav>,
    document.body
  );
}