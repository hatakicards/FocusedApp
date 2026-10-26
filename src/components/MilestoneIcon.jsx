import { Shield, TrendingUp, Dumbbell, Brain, Target, Activity, Heart, Moon, Briefcase, Trophy, Award, Crown, Lock } from 'lucide-react';

const ICON_MAP = {
  Shield, TrendingUp, Dumbbell, Brain, Target, Activity, Heart, Moon, Briefcase, Trophy, Award, Crown,
};

// Sbloccata: simbolo scuro su un tondo di titanio; bloccata: lucchetto spento su fondo scuro.
export default function MilestoneIcon({ icon, unlocked, size = 56 }) {
  const Icon = unlocked ? (ICON_MAP[icon] || Lock) : Lock;
  const disc = size * 0.82;
  return (
    <div className="flex h-full w-full items-center justify-center">
      {unlocked ? (
        <span className="titanium-bg flex items-center justify-center rounded-full" style={{ width: disc, height: disc }}>
          <Icon size={size * 0.42} className="text-black" strokeWidth={1.8} />
        </span>
      ) : (
        <Icon size={size * 0.4} className="text-muted-foreground/30" strokeWidth={1.5} />
      )}
    </div>
  );
}
