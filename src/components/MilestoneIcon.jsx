import { Shield, TrendingUp, Dumbbell, Brain, Target, Activity, Heart, Moon, Briefcase, Trophy, Award, Crown, Lock } from 'lucide-react';

const ICON_MAP = {
  Shield, TrendingUp, Dumbbell, Brain, Target, Activity, Heart, Moon, Briefcase, Trophy, Award, Crown,
};

export default function MilestoneIcon({ icon, unlocked, size = 56 }) {
  const Icon = unlocked ? (ICON_MAP[icon] || Lock) : Lock;
  return (
    <div className="flex items-center justify-center w-full h-full">
      <Icon
        size={size * 0.45}
        className={unlocked ? 'text-foreground' : 'text-muted-foreground/30'}
        strokeWidth={1.5}
      />
    </div>
  );
}