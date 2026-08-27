import {
  Star, PenLine, Save, Plus, ChevronRight, Calendar, BarChart3, Target,
  TrendingUp, Trophy, CheckCircle, Dumbbell, Timer, Play, Activity, Settings,
  Flame, Apple, Moon, Scale, GraduationCap, ClipboardCheck, Briefcase, Euro, Calculator,
} from 'lucide-react';

export const TUTORIALS = {
  oggi: {
    titleKey: 'tut_oggi_title',
    steps: [
      { icon: Star, titleKey: 'tut_oggi_s1_t', textKey: 'tut_oggi_s1_d' },
      { icon: PenLine, titleKey: 'tut_oggi_s2_t', textKey: 'tut_oggi_s2_d' },
      { icon: Save, titleKey: 'tut_oggi_s3_t', textKey: 'tut_oggi_s3_d' },
    ],
  },
  abitudini: {
    titleKey: 'tut_abitudini_title',
    steps: [
      { icon: TrendingUp, titleKey: 'tut_abitudini_s1_t', textKey: 'tut_abitudini_s1_d' },
      { icon: Plus, titleKey: 'tut_abitudini_s2_t', textKey: 'tut_abitudini_s2_d' },
      { icon: ChevronRight, titleKey: 'tut_abitudini_s3_t', textKey: 'tut_abitudini_s3_d' },
    ],
  },
  activitydetail: {
    titleKey: 'tut_detail_title',
    steps: [
      { icon: Calendar, titleKey: 'tut_detail_s1_t', textKey: 'tut_detail_s1_d' },
      { icon: BarChart3, titleKey: 'tut_detail_s2_t', textKey: 'tut_detail_s2_d' },
      { icon: Target, titleKey: 'tut_detail_s3_t', textKey: 'tut_detail_s3_d' },
    ],
  },
  obiettivi: {
    titleKey: 'tut_obiettivi_title',
    steps: [
      { icon: Trophy, titleKey: 'tut_obiettivi_s1_t', textKey: 'tut_obiettivi_s1_d' },
      { icon: Target, titleKey: 'tut_obiettivi_s2_t', textKey: 'tut_obiettivi_s2_d' },
    ],
  },
  agenda: {
    titleKey: 'tut_agenda_title',
    steps: [
      { icon: CheckCircle, titleKey: 'tut_agenda_s1_t', textKey: 'tut_agenda_s1_d' },
      { icon: Plus, titleKey: 'tut_agenda_s2_t', textKey: 'tut_agenda_s2_d' },
      { icon: Dumbbell, titleKey: 'tut_agenda_s3_t', textKey: 'tut_agenda_s3_d' },
    ],
  },
  focus: {
    titleKey: 'tut_focus_title',
    steps: [
      { icon: Timer, titleKey: 'tut_focus_s1_t', textKey: 'tut_focus_s1_d' },
      { icon: Play, titleKey: 'tut_focus_s2_t', textKey: 'tut_focus_s2_d' },
    ],
  },
  gym: {
    titleKey: 'tut_gym_title',
    steps: [
      { icon: Dumbbell, titleKey: 'tut_gym_s1_t', textKey: 'tut_gym_s1_d' },
      { icon: Target, titleKey: 'tut_gym_s2_t', textKey: 'tut_gym_s2_d' },
    ],
  },
  statistiche: {
    titleKey: 'tut_statistiche_title',
    steps: [
      { icon: Activity, titleKey: 'tut_statistiche_s1_t', textKey: 'tut_statistiche_s1_d' },
      { icon: TrendingUp, titleKey: 'tut_statistiche_s2_t', textKey: 'tut_statistiche_s2_d' },
    ],
  },
  profilo: {
    titleKey: 'tut_profilo_title',
    steps: [
      { icon: Flame, titleKey: 'tut_profilo_s1_t', textKey: 'tut_profilo_s1_d' },
      { icon: Settings, titleKey: 'tut_profilo_s2_t', textKey: 'tut_profilo_s2_d' },
    ],
  },
  bodyfuel: {
    titleKey: 'tut_bodyfuel_title',
    steps: [
      { icon: Apple, titleKey: 'tut_bodyfuel_s1_t', textKey: 'tut_bodyfuel_s1_d' },
      { icon: Moon, titleKey: 'tut_bodyfuel_s2_t', textKey: 'tut_bodyfuel_s2_d' },
      { icon: Scale, titleKey: 'tut_bodyfuel_s3_t', textKey: 'tut_bodyfuel_s3_d' },
    ],
  },
  lezioni: {
    titleKey: 'tut_lezioni_title',
    steps: [
      { icon: GraduationCap, titleKey: 'tut_lezioni_s1_t', textKey: 'tut_lezioni_s1_d' },
      { icon: ClipboardCheck, titleKey: 'tut_lezioni_s2_t', textKey: 'tut_lezioni_s2_d' },
      { icon: Calculator, titleKey: 'tut_lezioni_s3_t', textKey: 'tut_lezioni_s3_d' },
    ],
  },
  workspace: {
    titleKey: 'tut_workspace_title',
    steps: [
      { icon: Briefcase, titleKey: 'tut_workspace_s1_t', textKey: 'tut_workspace_s1_d' },
      { icon: Euro, titleKey: 'tut_workspace_s2_t', textKey: 'tut_workspace_s2_d' },
    ],
  },
};