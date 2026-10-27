import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, HeartPulse, Hourglass, MapPin, Check, ArrowLeft, Info, CheckCircle, Calendar, Play, Target, Loader2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { LOGO_URL } from '@/lib/constants';
import { LANGUAGES, useI18n, useT } from '@/lib/i18n';
import { listPermissions, permissionState, askPermission, openAppSettings } from '@/lib/permissions';

const TUT_ICONS = [CheckCircle, Calendar, Play, Target];

// Benvenuto a schermo intero, prima del login (e una volta sola anche per chi e' gia' dentro):
// logo, nome, lingua, sogno, permessi, due domande e un giro a passi dell'app.
// In alto la barretta dei passi; in basso, sul giro, "Sai gia' come funziona?".
const STAGES = ['splash', 'name', 'lang', 'dream', 'perms', 'q1', 'q2', 'tour'];

const shell = 'fixed inset-0 z-[95] flex flex-col overflow-y-auto bg-black text-white';
const titaniumBtn = 'titanium-bg flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold active:scale-[0.98] transition-transform disabled:opacity-30';

function Page({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
      className="mx-auto flex w-full max-w-md flex-1 flex-col px-6 pb-8 pt-4"
    >
      {children}
    </motion.div>
  );
}

// data: { name, birthDate, dream }; onDone({ name, birthDate, dream, skipTutorial, permsAsked })
export default function WelcomeIntro({ initial = {}, onDone, existing = false }) {
  const t = useT();
  const { lang, setLang } = useI18n();
  const [stage, setStage] = useState('splash');
  const [name, setName] = useState(initial.name || '');
  const [birthDate, setBirthDate] = useState(initial.birthDate || '');
  const [showWhy, setShowWhy] = useState(false);
  const [dream, setDream] = useState(initial.dream || '');
  const [perms, setPerms] = useState(['notifications']);
  const [permState, setPermState] = useState({}); // id -> 'granted' | 'denied' | 'prompt' | 'busy'
  const [busy, setBusy] = useState(false);
  const [tourIdx, setTourIdx] = useState(0);

  const idx = STAGES.indexOf(stage);

  // Splash: parte da solo dopo qualche secondo, o al tocco.
  useEffect(() => {
    if (stage !== 'splash') return undefined;
    const id = setTimeout(() => setStage('name'), 3800);
    return () => clearTimeout(id);
  }, [stage]);

  useEffect(() => {
    (async () => {
      const list = await listPermissions();
      setPerms(list);
      const states = {};
      for (const id of list) states[id] = await permissionState(id);
      setPermState(states);
    })();
  }, []);

  const permMeta = useMemo(() => ({
    notifications: { icon: Bell, title: 'wl_perm_notif', text: 'wl_perm_notif_d' },
    health: { icon: HeartPulse, title: 'wl_perm_health', text: 'wl_perm_health_d' },
    location: { icon: MapPin, title: 'wl_perm_loc', text: 'wl_perm_loc_d' },
    screentime: { icon: Hourglass, title: 'wl_perm_st', text: 'wl_perm_st_d' },
  }), []);

  // Un permesso alla volta, sempre dopo un tocco: il popup di iOS compare e si aspetta la risposta.
  const askOne = async (id) => {
    setPermState((p) => ({ ...p, [id]: 'busy' }));
    const next = await askPermission(id);
    setPermState((p) => ({ ...p, [id]: next === 'prompt' ? 'asked' : next }));
  };

  const askAll = async () => {
    if (busy) return;
    setBusy(true);
    for (const id of perms) {
      if (['granted', 'denied', 'asked'].includes(permState[id])) continue;
      await askOne(id);
    }
    setBusy(false);
  };

  const pending = perms.some((id) => !['granted', 'denied', 'asked'].includes(permState[id]));

  const finish = (skipTutorial) => onDone({ name: name.trim(), birthDate, dream: dream.trim(), skipTutorial, permsAsked: true });

  const goBack = () => {
    const prev = STAGES[Math.max(1, idx - 1)];
    setStage(prev);
  };

  const showBar = stage !== 'splash';
  const tourSteps = [1, 2, 3, 4];

  let body = null;
  if (stage === 'splash') {
    body = (
      <motion.div
        key="splash"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.8 }}
        onClick={() => setStage('name')}
        className="relative flex flex-1 cursor-pointer flex-col items-center justify-center px-8 text-center"
      >
        <div className="titanium-glow pointer-events-none absolute inset-x-0 top-0 h-2/3" />
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative mb-10 h-28 w-28"
        >
          <Image src={LOGO_URL} alt="Focused" fittingType="fit" className="h-full w-full object-contain" />
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="relative text-4xl font-bold leading-tight tracking-tight"
        >
          {t('wl_welcome')}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="titanium-text relative mt-3 text-lg font-medium"
        >
          {t('wl_tagline')}
        </motion.p>
      </motion.div>
    );
  } else if (stage === 'name') {
    body = (
      <Page key="name">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="mb-8 text-3xl font-bold tracking-tight">{t('wl_name_t')}</h1>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('wl_name_ph')}
            autoFocus
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-base font-medium outline-none focus:border-white/40"
          />
          <div className="mb-2 mt-6 flex items-center gap-1.5">
            <label className="text-xs uppercase tracking-wider text-white/50">{t('wl_birth')}</label>
            <button type="button" onClick={() => setShowWhy((v) => !v)} className="text-white/50"><Info size={14} /></button>
          </div>
          {showWhy && <p className="mb-2 text-xs leading-snug text-white/50">{t('wl_birth_why')}</p>}
          <input
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-base font-medium outline-none [color-scheme:dark] focus:border-white/40"
          />
        </div>
        <button onClick={() => setStage('lang')} disabled={!name.trim()} className={`${titaniumBtn} mt-8`}>{t('wl_continue')}</button>
      </Page>
    );
  } else if (stage === 'lang') {
    body = (
      <Page key="lang">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="mb-8 text-3xl font-bold tracking-tight">{t('wl_lang_t')}</h1>
          <div className="space-y-2.5">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLang(l.code)}
                className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors ${lang === l.code ? 'border-white bg-white/10' : 'border-white/15 bg-white/5'}`}
              >
                <img src={l.flag} alt="" className="h-6 w-6 rounded-full object-cover" />
                <span className="flex-1 text-base font-semibold">{l.label}</span>
                {lang === l.code && <Check size={18} />}
              </button>
            ))}
          </div>
        </div>
        <button onClick={() => setStage('dream')} className={`${titaniumBtn} mt-8`}>{t('wl_continue')}</button>
      </Page>
    );
  } else if (stage === 'dream') {
    body = (
      <Page key="dream">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{t('wl_dream_t')}</h1>
          <p className="mb-6 text-sm text-white/50">{t('wl_dream_d')}</p>
          <textarea
            value={dream}
            onChange={(e) => setDream(e.target.value)}
            placeholder={t('wl_dream_ph')}
            rows={5}
            autoFocus
            className="w-full resize-none rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-base font-medium outline-none focus:border-white/40"
          />
          <AnimatePresence>
            {dream.trim().length > 5 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4 text-center">
                <p className="text-sm font-semibold">{t('wl_pact_1')}</p>
                <p className="mt-1 text-sm text-white/50">{t('wl_pact_2')}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button onClick={() => setStage('perms')} disabled={!dream.trim()} className={`${titaniumBtn} mt-8`}>{t('wl_continue')}</button>
      </Page>
    );
  } else if (stage === 'perms') {
    body = (
      <Page key="perms">
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="mb-2 text-3xl font-bold tracking-tight">{t('wl_perm_t')}</h1>
          <p className="mb-7 text-sm text-white/50">{t('wl_perm_d')}</p>
          <div className="space-y-2.5">
            {perms.map((id) => {
              const m = permMeta[id];
              const Icon = m.icon;
              const st = permState[id] || 'prompt';
              return (
                <div key={id} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/10"><Icon size={20} strokeWidth={1.7} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{t(m.title)}</span>
                    <span className="block text-xs leading-snug text-white/50">{t(m.text)}</span>
                  </span>
                  {st === 'granted' && <Check size={18} className="shrink-0" />}
                  {st === 'busy' && <Loader2 size={18} className="shrink-0 animate-spin text-white/60" />}
                  {(st === 'prompt' || st === 'asked') && (
                    <button onClick={() => askOne(id)} disabled={busy} className="titanium-bg shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold disabled:opacity-40">{t('wl_perm_allow')}</button>
                  )}
                  {st === 'denied' && (
                    <button onClick={openAppSettings} className="shrink-0 rounded-full border border-white/25 px-3 py-1.5 text-xs font-semibold text-white/80">{t('wl_perm_settings')}</button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <button
          onClick={pending ? askAll : () => setStage('q1')}
          disabled={busy}
          className={`${titaniumBtn} mt-8`}
        >
          {t(pending ? 'wl_perm_all' : 'wl_continue')}
        </button>
        {pending && <button onClick={() => setStage('q1')} className="mt-3 py-2 text-sm font-medium text-white/50">{t('wl_perm_later')}</button>}
      </Page>
    );
  } else if (stage === 'q1' || stage === 'q2') {
    const first = stage === 'q1';
    body = (
      <Page key={stage}>
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-4xl font-bold leading-tight tracking-tight">{t(first ? 'wl_q1' : 'wl_q2')}</h1>
        </div>
        <button onClick={() => setStage(first ? 'q2' : 'tour')} className={`${titaniumBtn} mt-8 text-lg`}>
          {t(first ? 'wl_q1_btn' : 'wl_q2_btn')}
        </button>
      </Page>
    );
  } else if (stage === 'tour') {
    const Icon = TUT_ICONS[tourIdx];
    const last = tourIdx === tourSteps.length - 1;
    body = (
      <Page key="tour">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={tourIdx}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center"
            >
              <span className="titanium-tile mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10">
                <Icon size={44} strokeWidth={1.5} />
              </span>
              <h1 className="mb-3 text-3xl font-bold tracking-tight">{t(`wl_tut${tourIdx + 1}_t`)}</h1>
              <p className="max-w-xs text-base leading-relaxed text-white/60">{t(`wl_tut${tourIdx + 1}_d`)}</p>
            </motion.div>
          </AnimatePresence>
          <div className="mt-8 flex gap-1.5">
            {tourSteps.map((_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all ${i === tourIdx ? 'w-6 bg-white' : 'w-1.5 bg-white/25'}`} />
            ))}
          </div>
        </div>
        <button onClick={() => (last ? finish(false) : setTourIdx((i) => i + 1))} className={`${titaniumBtn} mt-8`}>
          {last ? t(existing ? 'wl_continue' : 'wl_tut_login') : t('wl_tut_next')}
        </button>
        <button onClick={() => finish(true)} className="mt-4 py-2 text-xs font-medium text-white/45 underline underline-offset-4">
          {t('wl_skip_tut')}
        </button>
      </Page>
    );
  }

  return (
    <div className={shell}>
      {showBar && (
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-6 pt-[calc(env(safe-area-inset-top)+1rem)]">
          {stage !== 'name' ? (
            <button onClick={stage === 'tour' && tourIdx > 0 ? () => setTourIdx((i) => i - 1) : goBack} aria-label={t('wl_back')} className="text-white/60">
              <ArrowLeft size={20} />
            </button>
          ) : <span className="w-5" />}
          <div className="flex flex-1 gap-1">
            {STAGES.slice(1).map((s, i) => (
              <span key={s} className={`h-1 flex-1 rounded-full ${i < idx ? 'titanium-bg' : 'bg-white/15'}`} />
            ))}
          </div>
        </div>
      )}
      <AnimatePresence mode="wait">{body}</AnimatePresence>
    </div>
  );
}
