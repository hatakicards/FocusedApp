import {
  Star, Dumbbell, Footprints, Bike, Waves, Target, BookOpen, Pencil, GraduationCap, Brain, Laptop, Briefcase, Coins, FileText, Palette, Music, Guitar, Zap, Flame, Gem, Sparkle, Moon, Sun, Sprout, TreePine as Tree, Droplet, Apple, Heart, Book, Check, Gamepad2, Trophy, Medal, Puzzle, FlaskConical
} from 'lucide-react';

const ICON_MAP = {
  star: Star, dumbbell: Dumbbell, footprints: Footprints, bike: Bike, waves: Waves,
  target: Target, bookopen: BookOpen, pencil: Pencil, graduation: GraduationCap,
  brain: Brain, laptop: Laptop, briefcase: Briefcase, coins: Coins, file: FileText,
  palette: Palette, music: Music, guitar: Guitar, zap: Zap, flame: Flame, gem: Gem,
  sparkle: Sparkle, moon: Moon, sun: Sun, sprout: Sprout, tree: Tree, droplet: Droplet,
  apple: Apple, heart: Heart, book: Book, check: Check, gamepad: Gamepad2,
  trophy: Trophy, medal: Medal, puzzle: Puzzle, flask: FlaskConical,
};

export function getActivityIcon(name) {
  return ICON_MAP[name] || Star;
}

export default function ActivityIcon({ name, size = 16, className = '' }) {
  const Icon = getActivityIcon(name);
  return <Icon size={size} className={className} strokeWidth={2} />;
}