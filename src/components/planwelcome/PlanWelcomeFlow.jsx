import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Ban, Trophy, BarChart3, Sparkles, LayoutGrid, Dumbbell, GraduationCap, Briefcase, Mic, ListChecks,
  CalendarCheck, Bell, Timer, Plus, Check, Hand,
} from 'lucide-react';
import { useT } from '@/lib/i18n';
import { useSubscription, useUserSettings, useOptimisticSettingsUpdate, useInvalidateAll, useSubjects, useOptimisticSubjectSave } from '@/lib/useAppData';
import { clearPlanWelcome, showTourTab } from '@/lib/planWelcome';
import UnlockIntro from './UnlockIntro';
import Spot from './Spot';

// Benvenuto al piano appena attivato. Pro: lucchetto che si apre, cosa e' incluso, poi in LifeGame i 3 rank
// illuminati da toccare (si apre il medaglione) e le Statistiche. Premium: lo stesso, poi come si sceglie
// la modalita' in Oggi o scorrendo in Personal, le tre pagine spiegate punto per punto (Studente con le
// materie da creare subito), Focusy che registra il cibo, e infine la modalita' da cui partire.

const FEATURES = {
  pro: [[Ban, 'pw_f_noads'], [Trophy, 'pw_f_ranks'], [BarChart3, 'pw_f_stats'], [Sparkles, 'pw_f_focusy_pro']],
  premium: [[Ban, 'pw_f_noads'], [Trophy, 'pw_f_ranks'], [BarChart3, 'pw_f_stats'], [LayoutGrid, 'pw_f_modes'], [Sparkles, 'pw_f_focusy_premium']],
};

const SUBJECT_SUGGESTIONS = ['pw_subj_math', 'pw_subj_lang', 'pw_subj_english', 'pw_subj_history', 'pw_subj_science', 'pw_subj_physics', 'pw_subj_art', 'pw_subj_pe'];

const MODES = [
  { id: 'atleta', to: '/body-fuel', icon: Dumbbell },
  { id: 'studente', to: '/lezioni', icon: GraduationCap },
  { id: 'professionista', to: '/workspace', icon: Briefcase },
];

const TUTORIALS_COVERED = ['obiettivi', 'bodyfuel', 'lezioni', 'workspace'];

function buildSteps(tier) {
  const lifegame = [
    { id: 'ranks', kind: 'spot', route: '/obiettivi', tab: ['lifegame', 'ranking'], target: '[data-tour="rank-grid"]', passthrough: true, eyebrow: 'LifeGame', title: 'pw_ranks_t', text: 'pw_ranks_d', waitMedallion: true },
    { id: 'stats', kind: 'spot', route: '/obiettivi', tab: ['lifegame', 'lifestats'], target: '[data-tour="lg-tabs"]', dim: 0.55, sheetAtBottom: true, eyebrow: 'LifeGame', title: 'pw_stats_t', text: 'pw_stats_d' },
  ];
  if (tier !== 'premium') return [{ id: 'unlock', kind: 'unlock' }, { id: 'intro', kind: 'intro' }, ...lifegame, { id: 'done', kind: 'done' }];

  const ath = { route: '/body-fuel', profile: 'atleta', eyebrow: 'pw_eb_athlete', swipe: true };
  const st = { route: '/lezioni', profile: 'studente', eyebrow: 'pw_eb_student', swipe: true };
  const ws = { route: '/workspace', profile: 'professionista', eyebrow: 'pw_eb_pro', swipe: true };
  return [
    { id: 'unlock', kind: 'unlock' },
    { id: 'intro', kind: 'intro' },
    ...lifegame,
    { id: 'modes', kind: 'spot', route: '/home', target: '[data-tour="profile-selector"]', eyebrow: 'pw_eb_modes', title: 'pw_modes_t', text: 'pw_modes_d' },
    { id: 'ath_top', kind: 'spot', ...ath, target: '[data-tour="bf-top"]', title: 'pw_ath_top_t', text: 'pw_ath_top_d' },
    { id: 'ath_food', kind: 'spot', ...ath, target: '[data-tour="bf-food"]', title: 'pw_ath_food_t', text: 'pw_ath_food_d' },
    { id: 'ath_sleep', kind: 'spot', ...ath, target: '[data-tour="bf-sleep"]', title: 'pw_ath_sleep_t', text: 'pw_ath_sleep_d' },
    { id: 'swipe', kind: 'spot', ...ath, target: '[data-tour="mode-dots"]', dim: 0.6, title: 'pw_swipe_t', text: 'pw_swipe_d', hand: true },
    { id: 'st_materie', kind: 'spot', ...st, target: '[data-tour="materie"]', title: 'pw_st_materie_t', text: 'pw_st_materie_d', subjects: true },
    { id: 'st_voti', kind: 'spot', ...st, tab: ['lezioni', 'voti'], target: '[data-tour="lezioni-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_st_voti_t', text: 'pw_st_voti_d' },
    { id: 'st_verifiche', kind: 'spot', ...st, tab: ['lezioni', 'verifiche'], target: '[data-tour="lezioni-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_st_verifiche_t', text: 'pw_st_verifiche_d' },
    { id: 'st_orario', kind: 'spot', ...st, tab: ['lezioni', 'orario'], target: '[data-tour="lezioni-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_st_orario_t', text: 'pw_st_orario_d' },
    { id: 'st_libri', kind: 'spot', ...st, tab: ['lezioni', 'libri'], target: '[data-tour="lezioni-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_st_libri_t', text: 'pw_st_libri_d' },
    { id: 'st_sim', kind: 'spot', ...st, tab: ['lezioni', 'simulatore'], target: '[data-tour="lezioni-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_st_sim_t', text: 'pw_st_sim_d' },
    {
      id: 'st_links', kind: 'spot', ...st, tab: ['lezioni', 'voti'], title: 'pw_st_links_t', text: 'pw_st_links_d',
      bullets: [[CalendarCheck, 'pw_st_link_agenda'], [Bell, 'pw_st_link_remind'], [Sparkles, 'pw_st_link_focusy'], [Timer, 'pw_st_link_focus']],
    },
    { id: 'ws_day', kind: 'spot', ...ws, tab: ['workspace', 'giornata'], target: '[data-tour="ws-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_ws_day_t', text: 'pw_ws_day_d' },
    { id: 'ws_projects', kind: 'spot', ...ws, tab: ['workspace', 'progetti'], target: '[data-tour="ws-tabs"]', dim: 0.55, sheetAtBottom: true, title: 'pw_ws_proj_t', text: 'pw_ws_proj_d' },
    { id: 'focusy', kind: 'focusy' },
    { id: 'choose', kind: 'choose' },
  ];
}

const sheet = 'max-h-[58vh] overflow-y-auto rounded-2xl bg-white p-5 text-black shadow-2xl';
const darkPrimary = 'rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white active:scale-95';
const whitePrimary = 'w-full rounded-2xl bg-white py-3.5 text-sm font-semibold text-black transition-transform active:scale-[0.98] disabled:opacity-40';

function SwipeHand() {
  return (
    <div className="relative mb-3 h-12 overflow-hidden rounded-xl bg-black/[0.05]">
      <motion.div
        className="absolute top-2.5"
        initial={{ x: 220, opacity: 0 }}
        animate={{ x: [220, 220, 40, 40], opacity: [0, 1, 1, 0] }}
        transition={{ duration: 1.8, times: [0, 0.15, 0.75, 1], repeat: Infinity, repeatDelay: 0.4 }}
      >
        <Hand size={26} strokeWidth={1.75} />
      </motion.div>
    </div>
  );
}

function SubjectsQuickAdd() {
  const t = useT();
  const { data: subjects } = useSubjects();
  const save = useOptimisticSubjectSave();
  const [name, setName] = useState('');
  const have = new Set((subjects || []).map((s) => (s.name || '').toLowerCase()));
  const add = (n) => {
    const v = n.trim();
    if (!v || have.has(v.toLowerCase())) return;
    save(null, { name: v });
  };
  return (
    <div className="mt-3">
      <div className="mb-2 flex flex-wrap gap-1.5">
        {SUBJECT_SUGGESTIONS.map((k) => {
          const label = t(k);
          const on = have.has(label.toLowerCase());
          return (
            <button
              key={k}
              onClick={() => add(label)}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${on ? 'bg-black text-white' : 'border border-black/15 text-black/70'}`}
            >
              {on ? <Check size={12} strokeWidth={3} /> : <Plus size={12} />} {label}
            </button>
          );
        })}
        {/* Quelle scritte a mano (o gia' create prima) compaiono accanto ai suggerimenti. */}
        {(subjects || [])
          .filter((s) => s.name && !SUBJECT_SUGGESTIONS.some((k) => t(k).toLowerCase() === s.name.toLowerCase()))
          .map((s) => (
            <span key={s.id || s.name} className="flex items-center gap-1 rounded-lg bg-black px-2.5 py-1.5 text-xs font-semibold text-white">
              <Check size={12} strokeWidth={3} /> {s.name}
            </span>
          ))}
      </div>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(name); setName(''); }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('pw_subj_ph')}
          className="min-w-0 flex-1 rounded-xl border border-black/15 px-3 py-2 text-sm outline-none focus:border-black/40"
        />
        <button type="submit" disabled={!name.trim()} className="rounded-xl bg-black px-3 text-white disabled:opacity-30"><Plus size={16} /></button>
      </form>
      {(subjects || []).length > 0 && (
        <p className="mt-2 text-[11px] text-black/50">{t('pw_subj_count').replace('{n}', String(subjects.length))}</p>
      )}
    </div>
  );
}

export default function PlanWelcomeFlow({ tier, onDone }) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const sub = useSubscription();
  const invalidate = useInvalidateAll();
  const { data: settings } = useUserSettings();
  const updateSettings = useOptimisticSettingsUpdate();
  const steps = useMemo(() => buildSteps(tier), [tier]);
  // Solo in sviluppo: ?plan_welcome_step=st_voti parte da quel passo, per rivedere un punto senza rifare tutto.
  const [i, setI] = useState(() => {
    if (!import.meta.env.DEV) return 0;
    const id = new URLSearchParams(window.location.search).get('plan_welcome_step');
    return Math.max(0, steps.findIndex((s) => s.id === id));
  });
  const [medallionOpen, setMedallionOpen] = useState(false);
  const [waitedLong, setWaitedLong] = useState(false);
  const step = steps[i];
  const ready = tier === 'premium' ? sub.isPremium : sub.isPro;

  // I tutorial a comparsa delle pagine che spieghiamo qui non devono aprirsi sopra.
  useEffect(() => {
    try { TUTORIALS_COVERED.forEach((id) => localStorage.setItem(`tutorial_seen_${id}`, '1')); } catch { /* ignore */ }
  }, []);

  // Il piano puo' arrivare dal server qualche secondo dopo l'acquisto: si ricontrolla finche' non c'e'.
  useEffect(() => {
    if (ready) return undefined;
    invalidate();
    const id = setInterval(invalidate, 2500);
    const long = setTimeout(() => setWaitedLong(true), 12000);
    return () => { clearInterval(id); clearTimeout(long); };
  }, [ready]);

  // Pagina, scheda e modalita' giuste per il passo corrente.
  useEffect(() => {
    if (!step) return;
    if (step.route && location.pathname !== step.route) navigate(step.route);
    if (step.profile && settings?.id && settings.profile_type !== step.profile) updateSettings(settings.id, { profile_type: step.profile });
    if (step.tab) showTourTab(step.tab[0], step.tab[1]);
  }, [i]);

  // Rank toccato: si apre il medaglione; quando lo si chiude si va avanti.
  useEffect(() => {
    const on = (e) => {
      if (!steps[i]?.waitMedallion) return;
      if (e.detail) setMedallionOpen(true);
      else { setMedallionOpen(false); setI((n) => n + 1); }
    };
    window.addEventListener('rank-medallion', on);
    return () => window.removeEventListener('rank-medallion', on);
  }, [i, steps]);

  const finish = () => {
    clearPlanWelcome();
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.has('plan_welcome')) { url.searchParams.delete('plan_welcome'); window.history.replaceState(null, '', url.pathname + url.search); }
    } catch { /* ignore */ }
    onDone();
  };
  const next = () => (i + 1 < steps.length ? setI(i + 1) : finish());
  const back = () => setI(Math.max(1, i - 1));
  const onSwipe = (dir) => {
    if (!step?.swipe) return;
    const target = i + dir;
    if (target >= 0 && target < steps.length && steps[target].swipe) setI(target);
    else if (dir > 0) next();
  };

  const choose = (m) => {
    if (settings?.id) updateSettings(settings.id, { profile_type: m.id });
    finish();
    navigate(m.to);
  };

  if (!step) return null;

  let body = null;

  if (step.kind === 'unlock') {
    body = <UnlockIntro key="unlock" tier={tier} targets={tier === 'premium' ? ['obiettivi', 'personal'] : ['obiettivi']} onContinue={next} />;
  } else if (step.kind === 'intro' || step.kind === 'focusy' || step.kind === 'choose' || step.kind === 'done') {
    let content;
    if (step.kind === 'intro') {
      content = (
        <>
          <h2 className="mb-1 text-2xl font-bold tracking-tight">{t('pw_intro_t')}</h2>
          <p className="mb-6 text-sm text-white/60">{t(tier === 'premium' ? 'pw_intro_premium' : 'pw_intro_pro')}</p>
          <div className="mb-8 space-y-3">
            {FEATURES[tier].map(([Icon, key], k) => (
              <motion.div key={key} className="flex items-start gap-3" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + k * 0.1 }}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><Icon size={17} strokeWidth={1.75} /></span>
                <p className="pt-2 text-sm leading-snug">{t(key)}</p>
              </motion.div>
            ))}
          </div>
          <button onClick={next} disabled={!ready && !waitedLong} className={whitePrimary}>
            {ready || waitedLong ? t('pw_show_me') : t('pw_activating')}
          </button>
        </>
      );
    } else if (step.kind === 'focusy') {
      content = (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black"><Sparkles size={26} /></div>
          <h2 className="mb-1 text-2xl font-bold tracking-tight">{t('pw_focusy_t')}</h2>
          <p className="mb-5 text-sm leading-relaxed text-white/60">{t('pw_focusy_d')}</p>
          <div className="mb-5 space-y-2">
            <motion.p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-white px-3.5 py-2.5 text-sm text-black" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              {t('pw_focusy_ex_user')}
            </motion.p>
            <motion.p className="max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-3.5 py-2.5 text-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }}>
              {t('pw_focusy_ex_bot')}
            </motion.p>
          </div>
          <div className="mb-7 space-y-2.5">
            {[[Mic, 'pw_focusy_voice'], [ListChecks, 'pw_focusy_create'], [GraduationCap, 'pw_focusy_school']].map(([Icon, key]) => (
              <p key={key} className="flex items-start gap-2.5 text-sm text-white/80"><Icon size={16} className="mt-0.5 shrink-0" /> {t(key)}</p>
            ))}
          </div>
          <button onClick={next} className={whitePrimary}>{t('pw_next')}</button>
        </>
      );
    } else if (step.kind === 'choose') {
      content = (
        <>
          <h2 className="mb-1 text-2xl font-bold tracking-tight">{t('pw_choose_t')}</h2>
          <p className="mb-6 text-sm leading-relaxed text-white/60">{t('pw_choose_d')}</p>
          <div className="space-y-2.5">
            {MODES.map((m) => (
              <button key={m.id} onClick={() => choose(m)} className="flex w-full items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4 text-left active:scale-[0.98]">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10"><m.icon size={19} strokeWidth={1.75} /></span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{t('profile_' + m.id)}</span>
                  <span className="block text-xs text-white/50">{t('profile_' + m.id + '_desc')}</span>
                </span>
              </button>
            ))}
          </div>
        </>
      );
    } else {
      content = (
        <>
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black"><Check size={26} strokeWidth={2.5} /></div>
          <h2 className="mb-2 text-2xl font-bold tracking-tight">{t('pw_done_t')}</h2>
          <p className="mb-8 text-sm leading-relaxed text-white/60">{t('pw_done_pro_d')}</p>
          <button onClick={finish} className={whitePrimary}>{t('pw_done_btn')}</button>
        </>
      );
    }
    body = (
      <motion.div key={step.id} className="fixed inset-0 z-[90] flex flex-col bg-black/95 text-white backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <div className="flex justify-end px-6 pt-[calc(env(safe-area-inset-top)+14px)]">
          {step.kind !== 'choose' && step.kind !== 'done' && <button onClick={finish} className="text-xs text-white/40">{t('pw_skip')}</button>}
        </div>
        <motion.div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 pb-10" initial={{ y: 20 }} animate={{ y: 0 }}>
          {content}
        </motion.div>
      </motion.div>
    );
  } else if (step.kind === 'spot') {
    // Durante il medaglione il giro si fa da parte: resta solo un suggerimento in alto.
    if (medallionOpen) {
      body = (
        <motion.div key="medal-hint" className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+84px)] z-[105] mx-auto max-w-sm rounded-2xl bg-white/95 px-4 py-3 text-center text-xs font-medium text-black shadow-xl" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          {t('pw_medal_hint')}
        </motion.div>
      );
    } else {
      const group = steps.filter((s) => s.eyebrow === step.eyebrow);
      const pos = group.indexOf(step);
      const eyebrow = step.eyebrow?.startsWith('pw_') ? t(step.eyebrow) : step.eyebrow;
      body = (
        <Spot key={step.id} target={step.target} passthrough={step.passthrough} dim={step.dim} sheetAtBottom={step.sheetAtBottom} onSwipe={step.swipe ? onSwipe : undefined}>
          <motion.div className={sheet} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wider text-black/40">
              {eyebrow}{group.length > 1 ? ` · ${pos + 1}/${group.length}` : ''}
            </p>
            <h3 className="text-lg font-bold tracking-tight">{t(step.title)}</h3>
            {step.hand && <div className="mt-3"><SwipeHand /></div>}
            <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-black/70">{t(step.text)}</p>
            {step.bullets && (
              <div className="mt-3 space-y-2">
                {step.bullets.map(([Icon, key]) => (
                  <p key={key} className="flex items-start gap-2 text-[13px] leading-snug text-black/80"><Icon size={15} className="mt-0.5 shrink-0" /> {t(key)}</p>
                ))}
              </div>
            )}
            {step.subjects && <SubjectsQuickAdd />}
            {step.waitMedallion ? (
              <div className="mt-4 flex items-center justify-between">
                <motion.p className="text-sm font-semibold" animate={{ opacity: [1, 0.45, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>{t('pw_ranks_tap')}</motion.p>
                <button onClick={next} className="text-xs text-black/40">{t('pw_next')}</button>
              </div>
            ) : (
              <div className="mt-4 flex items-center justify-between">
                <button onClick={finish} className="text-xs text-black/40">{t('pw_skip')}</button>
                <div className="flex items-center gap-3">
                  {i > 2 && <button onClick={back} className="text-xs font-semibold text-black/50">{t('pw_back')}</button>}
                  <button onClick={next} className={darkPrimary}>{t('pw_next')}</button>
                </div>
              </div>
            )}
          </motion.div>
        </Spot>
      );
    }
  }

  return createPortal(<AnimatePresence mode="wait">{body}</AnimatePresence>, document.body);
}
