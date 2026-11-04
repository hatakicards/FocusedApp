import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useActivities, useRatings, useGoals, useSubscription, useLessonGrades, useLifeStats, useUserSettings, useBodyFuelEntries, useWorkDayLogs } from '@/lib/useAppData';
import LockedPreview from '@/components/LockedPreview';
import { CATEGORIES } from '@/lib/constants';
import { computeCategoryRank } from '@/lib/productivity';
import { useT } from '@/lib/i18n';
import RankBadge from '@/components/RankBadge';
import RankMedallion from '@/components/RankMedallion';
import TutorialDialog from '@/components/TutorialDialog';
import HelpButton from '@/components/HelpButton';
import MilestoneGrid from '@/components/MilestoneGrid';
import LifeStatsTab from '@/components/obiettivi/LifeStatsTab';
import { useTourTab } from '@/lib/planWelcome';

// Gli obiettivi stanno in Oggi (sotto le abitudini) e nel dettaglio di ogni abitudine: qui restano
// Ranking e Statistiche, e si passa dall'una all'altra anche scorrendo col dito.
const TABS = [['ranking', 'lg_tab_ranking'], ['lifestats', 'stat_titolo']];
const SWIPE_MIN = 60;

function ObiettiviRankingInner() {
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: goals } = useGoals();
  const { data: lessonGrades } = useLessonGrades();
  const { data: lifeStats } = useLifeStats();
  const { data: settings } = useUserSettings();
  const { data: bodyFuelEntries } = useBodyFuelEntries();
  const { data: workDayLogs } = useWorkDayLogs();
  const t = useT();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') === 'lifestats' ? 'lifestats' : 'ranking');
  const [direction, setDirection] = useState(0);
  const [medallion, setMedallion] = useState(null);
  const touch = useRef(null);
  useTourTab('lifegame', setTab);

  // Il benvenuto al piano aspetta che il medaglione si apra e si chiuda (non all'apertura della pagina).
  const medallionSeen = useRef(false);
  useEffect(() => {
    if (!medallion && !medallionSeen.current) return;
    medallionSeen.current = true;
    window.dispatchEvent(new CustomEvent('rank-medallion', { detail: !!medallion }));
  }, [!!medallion]);

  const goTo = (id) => {
    const from = TABS.findIndex(([k]) => k === tab);
    const to = TABS.findIndex(([k]) => k === id);
    if (to < 0 || to === from) return;
    setDirection(to > from ? 1 : -1);
    setTab(id);
  };

  // Scorrimento orizzontale: conta solo se e' chiaramente piu' in orizzontale che in verticale,
  // cosi' lo scroll della pagina non cambia scheda per sbaglio.
  const onTouchStart = (e) => {
    const p = e.touches[0];
    touch.current = { x: p.clientX, y: p.clientY };
  };
  const onTouchEnd = (e) => {
    if (!touch.current) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - touch.current.x;
    const dy = p.clientY - touch.current.y;
    touch.current = null;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const idx = TABS.findIndex(([k]) => k === tab);
    const next = TABS[idx + (dx < 0 ? 1 : -1)];
    if (next) goTo(next[0]);
  };

  return (
    <div className="px-5 safe-top pb-4 min-h-[70vh]" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      <header className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">LifeGame</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('lg_sub')}</p>
        </div>
        <HelpButton pageId="obiettivi" className="mt-1" />
      </header>

      <div data-tour="lg-tabs" className="mb-6 flex gap-1 rounded-full bg-foreground/[0.06] p-1">
        {TABS.map(([id, key]) => (
          <button
            key={id}
            onClick={() => goTo(id)}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${tab === id ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t(key)}
          </button>
        ))}
      </div>

      <div className="overflow-x-clip">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={tab}
            custom={direction}
            initial={{ x: direction * 60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction * -60, opacity: 0 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {tab === 'lifestats' && <LifeStatsTab />}

            {tab === 'ranking' && (
              <>
                <div data-tour="rank-grid" className="mb-2 grid grid-cols-3 gap-2.5">
                  {CATEGORIES.map((cat) => {
                    const rankInfo = computeCategoryRank(cat.id, activities || [], ratings || [], goals || [], lessonGrades || []);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setMedallion({ categoryId: cat.id, rankInfo })}
                        className="titanium-tile flex aspect-square flex-col items-center justify-center gap-2 rounded-3xl border border-border/70 p-2 text-center transition-transform active:scale-95"
                      >
                        <RankBadge rankId={rankInfo.rank?.id} size="lg" showName={false} />
                        <p className="line-clamp-2 w-full text-[10px] font-semibold leading-tight">{t('cat_' + cat.id)}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="mb-7 text-center text-[11px] text-muted-foreground">{t('rank_tap_hint')}</p>

                <MilestoneGrid activities={activities} ratings={ratings} goals={goals} lifeStats={lifeStats} bodyFuelEntries={bodyFuelEntries} workDayLogs={workDayLogs} settings={settings} lessonGrades={lessonGrades} />
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {medallion && (
          <RankMedallion
            key="medallion"
            categoryId={medallion.categoryId}
            rankInfo={medallion.rankInfo}
            onClose={() => setMedallion(null)}
          />
        )}
      </AnimatePresence>
      <TutorialDialog pageId="obiettivi" />
    </div>
  );
}

export default function ObiettiviRanking() {
  const sub = useSubscription();
  return (
    <LockedPreview locked={!sub.canUseRankings} tier="any" descKey="gate_goals_desc">
      <ObiettiviRankingInner />
    </LockedPreview>
  );
}
