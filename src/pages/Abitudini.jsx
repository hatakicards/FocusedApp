import { useInvalidateAll, useRatings, useDayEntries, useGoals } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { computeFocusScore } from '@/lib/productivity';
import FocusScore from '@/components/FocusScore';
import PullToRefresh from '@/components/PullToRefresh';
import CategoryTrendChart from '@/components/CategoryTrendChart';
import TutorialDialog from '@/components/TutorialDialog';
import ActivitiesList from '@/components/abitudini/ActivitiesList';

export default function Abitudini() {
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const { data: dayEntries } = useDayEntries();
  const focusScore = computeFocusScore(ratings, dayEntries, goals);
  const invalidate = useInvalidateAll();
  const t = useT();

  return (
    <PullToRefresh onRefresh={invalidate}>
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center gap-2.5">
        <h1 className="text-2xl font-bold tracking-tight truncate">{t('nav_abitudini')}</h1>
        <FocusScore score={focusScore} ratings={ratings} dayEntries={dayEntries} goals={goals} />
      </header>

      <CategoryTrendChart />

      <div className="mt-4">
        <ActivitiesList />
      </div>

      <TutorialDialog pageId="abitudini" />
    </div>
    </PullToRefresh>
  );
}
