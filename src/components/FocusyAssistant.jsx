import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Bot, User, Loader2, Lock, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useT } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import {
  useUserSettings,
  useActivities,
  useRatings,
  useGymSessions,
  useBodyFuelEntries,
  useDayEntries,
  useLifeStats,
  useGoals,
  useWorkDayLogs,
  useSubscription,
  useSubjects,
  useLessonGrades,
  useVerifiche,
  useGradeGoals,
  useHomeworks,
} from '@/lib/useAppData';
import { normalizeGrade } from '@/lib/grades';
import { sortHomeworkByPriority, priorityTier, averageNormalizedGradeForSubject } from '@/lib/studyPriority';
import { buildGymSummary } from '@/lib/gymContext';

const SUGGESTIONS = [
  { key: 'focusy_sugg_gym', text: 'Come posso migliorare la mia scheda di allenamento?' },
  { key: 'focusy_sugg_food', text: 'Analizza la mia alimentazione di oggi' },
  { key: 'focusy_sugg_motivation', text: 'Ho bisogno di motivazione per oggi' },
  { key: 'focusy_sugg_progress', text: 'Come stanno andando i miei progressi?' },
  { key: 'focusy_sugg_routine', text: 'Ottimizza la mia routine', isRoutine: true },
];

const ACTION_SUGGESTIONS = [
  { key: 'focusy_sugg_activity', text: 'Crea un\'attività per la meditazione' },
  { key: 'focusy_sugg_goal', text: 'Aggiungi un obiettivo: allenarmi 4 volte a settimana' },
  { key: 'focusy_sugg_task', text: 'Crea una cosa da fare: domani studiare 2 ore' },
  { key: 'focusy_sugg_event', text: 'Aggiungi evento: riunione venerdì alle 15' },
];

const LIMITS = { free: 2, pro: 10, premium: Infinity };

function getDailyCount() {
  const today = new Date().toISOString().split('T')[0];
  try {
    const raw = localStorage.getItem('focusy_msgs_' + today);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch { return 0; }
}

function incDailyCount() {
  const today = new Date().toISOString().split('T')[0];
  const n = getDailyCount() + 1;
  try { localStorage.setItem('focusy_msgs_' + today, String(n)); } catch { /* ignore */ }
  return n;
}

function buildContext({ settings, activities, ratings, gymSessions, bodyFuelEntries, dayEntries, lifeStats, goals, workDayLogs, subjects, lessonGrades, verifiche, gradeGoals, homeworks }) {
  const profileType = settings?.profile_type || 'base';

  const today = new Date().toISOString().split('T')[0];
  const last7 = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const last14 = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  // Per-activity stats (last 7 days)
  const activeActivities = (activities || []).filter(a => !a.archived);
  const activityNames = activeActivities.map(a => `${a.name} (cat:${a.category})`).join(', ');

  const activityStats = activeActivities.map(a => {
    const actRatings = (ratings || []).filter(r => r.activity_id === a.id && r.date >= last7);
    if (!actRatings.length) return null;
    const avg = (actRatings.reduce((s, r) => s + r.rating, 0) / actRatings.length).toFixed(1);
    return { name: a.name, category: a.category, avg: parseFloat(avg), count: actRatings.length };
  }).filter(Boolean);

  const bestActivity = activityStats.length ? activityStats.reduce((a, b) => a.avg > b.avg ? a : b) : null;
  const worstActivity = activityStats.length ? activityStats.reduce((a, b) => a.avg < b.avg ? a : b) : null;

  // Trend: this week vs previous week
  const recentRatings = (ratings || []).filter(r => r.date >= last7);
  const prevRatings = (ratings || []).filter(r => r.date >= last14 && r.date < last7);
  const avgRating = recentRatings.length
    ? (recentRatings.reduce((s, r) => s + r.rating, 0) / recentRatings.length).toFixed(2)
    : null;
  const prevAvg = prevRatings.length
    ? (prevRatings.reduce((s, r) => s + r.rating, 0) / prevRatings.length).toFixed(2)
    : null;
  let ratingTrend = 'N/A';
  if (avgRating && prevAvg) {
    const diff = parseFloat(avgRating) - parseFloat(prevAvg);
    ratingTrend = diff > 0.2 ? `↗️ in miglioramento (+${diff.toFixed(1)})` : diff < -0.2 ? `↘️ in calo (${diff.toFixed(1)})` : '→ stabile';
  }

  // Day entries trend
  const recentEntries = (dayEntries || []).filter(e => e.date >= last7);
  const prevEntries = (dayEntries || []).filter(e => e.date >= last14 && e.date < last7);
  const avgDayRating = recentEntries.length
    ? (recentEntries.reduce((s, e) => s + (e.day_rating || 0), 0) / recentEntries.length).toFixed(2)
    : null;
  const prevDayAvg = prevEntries.length
    ? (prevEntries.reduce((s, e) => s + (e.day_rating || 0), 0) / prevEntries.length).toFixed(2)
    : null;
  let dayTrend = 'N/A';
  if (avgDayRating && prevDayAvg) {
    const diff = parseFloat(avgDayRating) - parseFloat(prevDayAvg);
    dayTrend = diff > 0.2 ? `↗️ migliorando (+${diff.toFixed(1)})` : diff < -0.2 ? `↘️ peggiorando (${diff.toFixed(1)})` : '→ stabile';
  }

  // Nutrition
  const todayFuel = (bodyFuelEntries || []).find(e => e.date === today);
  const recentFuel = (bodyFuelEntries || []).filter(e => e.date >= last7).slice(-7);
  const avgCalories = recentFuel.length
    ? Math.round(recentFuel.reduce((s, e) => s + (e.calories_consumed || 0), 0) / recentFuel.length)
    : 0;
  const calorieGoal = settings?.daily_calories_goal || 0;
  const calorieDiff = todayFuel?.calories_consumed ? todayFuel.calories_consumed - calorieGoal : 0;

  // Goals
  const activeGoals = (goals || []).filter(g => !g.completed);
  const completedGoals = (goals || []).filter(g => g.completed);
  const goalList = activeGoals.slice(0, 5).map(g => {
    const act = activeActivities.find(a => a.id === g.activity_id);
    return `  - "${g.title}" (${g.timeframe}/${g.difficulty}) su ${act?.name || 'attività?'} — completato ${g.completed_periods?.length || 0} volte`;
  }).join('\n');

  const latestLifeStats = lifeStats && lifeStats.length ? lifeStats[lifeStats.length - 1] : null;
  const todayWork = (workDayLogs || []).find(w => w.date === today);
  const todayEntry = (dayEntries || []).find(e => e.date === today);

  const gymActive = activeActivities.some(a => a.is_gym || a.preset_type === 'gym');
  const gymSummary = buildGymSummary(gymSessions);

  // Scuola: media per materia + gap rispetto al grade goal, verifiche imminenti, compiti pendenti per priorità
  const subjectNames = [...new Set([
    ...(subjects || []).map(s => s.name),
    ...(lessonGrades || []).map(g => g.subject),
    ...(verifiche || []).map(v => v.subject),
  ])].filter(Boolean);
  const subjectSummary = subjectNames.length
    ? subjectNames.map(subj => {
        const avg = averageNormalizedGradeForSubject(subj, lessonGrades, verifiche);
        const goal = (gradeGoals || []).find(g => g.subject === subj);
        const goalPart = goal
          ? ` (obiettivo: ${Math.round(normalizeGrade(goal.grade, goal.grade_system))}/100, gap: ${Math.max(0, Math.round(normalizeGrade(goal.grade, goal.grade_system) - (avg ?? 0)))})`
          : ' (nessun obiettivo impostato)';
        return `  - ${subj}: ${avg != null ? Math.round(avg) + '/100' : 'nessun voto'}${goalPart}`;
      }).join('\n')
    : '  nessuna materia registrata';

  const todayMid = new Date();
  todayMid.setHours(0, 0, 0, 0);
  const in14Days = new Date(todayMid.getTime() + 14 * 86400000);
  const upcomingTests = (verifiche || [])
    .filter(v => v.status === 'scheduled' && new Date(v.date + 'T00:00:00') <= in14Days)
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcomingTestsSummary = upcomingTests.length
    ? upcomingTests.map(v => {
        const d = new Date(v.date + 'T00:00:00');
        const days = Math.round((d - todayMid) / 86400000);
        const when = days < 0 ? 'scaduto' : days === 0 ? 'oggi' : `tra ${days} giorni`;
        return `  - ${v.subject}${v.topic ? ` — ${v.topic}` : ''} — ${when}`;
      }).join('\n')
    : '  nessuna verifica imminente';

  const pendingHomework = sortHomeworkByPriority(homeworks, { gradeGoals, grades: lessonGrades, verifiche });
  const DIFFICULTY_LABEL = { quick: 'rapido', medium: 'medio', heavy: 'impegnativo' };
  const TIER_LABEL = { urgent: 'urgente', soon: 'presto', later: 'con calma' };
  const homeworkSummary = pendingHomework.length
    ? pendingHomework.slice(0, 8).map(h => `  - [${TIER_LABEL[priorityTier(h.priorityScore)]}] ${h.subject} — ${h.title} (${DIFFICULTY_LABEL[h.difficulty] || h.difficulty})${h.due_date ? ` — scadenza ${h.due_date}` : ''}`).join('\n')
    : '  nessun compito pendente';
  const difficultyCounts = pendingHomework.reduce((acc, h) => { acc[h.difficulty] = (acc[h.difficulty] || 0) + 1; return acc; }, {});

  // Activity rating breakdown string
  const activityBreakdown = activityStats.length
    ? activityStats.map(s => `  - ${s.name}: ${s.avg}/5 (${s.count} voti)`).join('\n')
    : '  nessun voto registrato questa settimana';

  return `Sei Focusy, l'assistente IA personale dell'app Focused. Rispondi SEMPRE in italiano, amichevole, conciso e motivazionale.

OBIETTIVO PRIMARIO: Dare consigli MIRATI basati sui dati reali dell'utente. NON dare consigli generici — cita sempre dati specifici (es. "La tua media è 3.2/5, in calo rispetto alla settimana scorsa"). Riferisciti alle attività per nome. Se un dato è "N/A" o 0, NON inventarlo.
${settings?.dream ? `\nIL SOGNO DELL'UTENTE: "${settings.dream}". Parti SEMPRE dal presupposto che l'utente sia realmente impegnato a raggiungerlo — non metterlo in dubbio, non trattarlo come velleità. Collega i tuoi consigli a questo sogno quando ha senso farlo (es. come l'attività di oggi lo avvicina o allontana da lì), senza forzarlo in ogni risposta.` : ''}

CREAZIONE ELEMENTI: Se l'utente chiede di creare/aggiungere/fare qualcosa, DEVI compilare l'array "actions" con l'azione appropriata. Esempi di richieste che richiedono azioni:
- "Crea un'attività per X" → create_activity
- "Aggiungi un obiettivo di X" → create_goal (usa activity_name esatto da ATTIVITÀ ESISTENTI)
- "Crea una task/devo fare X" → create_task
- "Aggiungi evento/riunione/scadenza X" → create_event
- "Crea un compito/homework di X" → create_homework
Se l'utente NON chiede di creare nulla, lascia "actions": [] e rispondi solo con "reply".

=== DATI UTENTE ===
PROFILO: ${profileType}
- Obiettivo fitness: ${settings?.fitness_goal || 'non impostato'}
- Livello attività: ${settings?.lifestyle_level || 'non impostato'}
- Sesso: ${settings?.biological_sex || 'non impostato'}
- Calorie obiettivo: ${calorieGoal} kcal | Proteine: ${settings?.protein_goal || 0}g | Carbo: ${settings?.carbs_goal || 0}g | Lipidi: ${settings?.lipids_goal || 0}g
- Gym: ${gymActive ? 'attiva' : 'inattiva'}

ATTIVITÀ ESISTENTI (usa nome esatto per create_goal):
${activityNames || 'nessuna'}

=== ALLENAMENTO (scheda per giorno, con le note libere dell'utente — interpretale in modo flessibile, ognuno usa la propria terminologia) ===
${gymSummary || '  nessuna scheda impostata'}

=== ANALISI ATTIVITÀ (ultimi 7 giorni) ===
${activityBreakdown}
${bestActivity ? `MIGLIORE: "${bestActivity.name}" (${bestActivity.avg}/5)` : ''}
${worstActivity && worstActivity.name !== bestActivity?.name ? `DA MIGLIORARE: "${worstActivity.name}" (${worstActivity.avg}/5)` : ''}

TREND VOTI ATTIVITÀ: ${avgRating ? `${avgRating}/5` : 'N/A'} ${ratingTrend}
TREND VOTO GIORNATA: ${avgDayRating ? `${avgDayRating}/5` : 'N/A'} ${dayTrend}
VOTO OGGI: ${todayEntry?.day_rating || 'non ancora dato'}

=== ALIMENTAZIONE ===
Oggi: ${todayFuel?.calories_consumed || 0} kcal ${calorieDiff ? `(obiettivo: ${calorieGoal}, ${calorieDiff > 0 ? '+' : ''}${calorieDiff})` : `(obiettivo: ${calorieGoal})`}
- Proteine: ${todayFuel?.protein_consumed || 0}g/${settings?.protein_goal || 0}g
- Carbo: ${todayFuel?.carbs_consumed || 0}g/${settings?.carbs_goal || 0}g
- Lipidi: ${todayFuel?.lipids_consumed || 0}g/${settings?.lipids_goal || 0}g
Media 7gg: ${avgCalories} kcal
Peso: ${todayFuel?.weight || recentFuel.find(e => e.weight)?.weight || 'non registrato'} kg

=== OBIETTIVI ===
Attivi: ${activeGoals.length} | Completati: ${completedGoals.length}
${goalList || 'nessun obiettivo attivo'}

=== LIFE STATS (ultimo) ===
${latestLifeStats ? `Forza:${latestLifeStats.forza} Int:${latestLifeStats.intelligenza} Disc:${latestLifeStats.disciplina} Aut:${latestLifeStats.autostima}${latestLifeStats.prestazione_atletica ? ` Atletica:${latestLifeStats.prestazione_atletica}` : ''}` : 'non registrati'}

=== LAVORO (oggi) ===
${todayWork ? `Ore:${todayWork.work_hours || 0} Riunioni:${todayWork.meetings_count || 0} Voto:${todayWork.work_rating || 'N/A'}` : 'non registrato'}

PENSIERI OGGI: "${todayEntry?.thoughts || 'nessuno'}"

=== SCUOLA ===
MEDIA PER MATERIA (voti + verifiche completate, gap rispetto all'obiettivo):
${subjectSummary}
VERIFICHE IMMINENTI (prossimi 14gg):
${upcomingTestsSummary}
COMPITI PENDENTI (ordinati per priorità — urgenza scadenza + difficoltà + materie indietro rispetto all'obiettivo):
${homeworkSummary}
Compiti totali pendenti: ${pendingHomework.length} (impegnativi:${difficultyCounts.heavy || 0} medi:${difficultyCounts.medium || 0} rapidi:${difficultyCounts.quick || 0})

=== AZIONI DISPONIBILI ===
Se l'utente chiede di creare qualcosa, compila "actions" con UN oggetto:
1. create_activity: { "type":"create_activity", "name":"...", "category":"fitness|mente|apprendimento|sport|work|studies|lifestyle|custom", "emoji":"..." }
2. create_goal: { "type":"create_goal", "title":"...", "timeframe":"daily|weekly|monthly|annual|lifetime", "difficulty":"easy|medium|hard", "activity_name":"<nome esatto da ATTIVITÀ ESISTENTI>" }
3. create_task: { "type":"create_task", "title":"...", "task_type":"todo", "due_date":"YYYY-MM-DD (opzionale)", "notes":"(opzionale)" }
4. create_event: { "type":"create_event", "title":"...", "task_type":"meeting|deadline", "due_date":"YYYY-MM-DD", "notes":"(opzionale)" }
5. create_homework: { "type":"create_homework", "subject":"...", "title":"...", "due_date":"YYYY-MM-DD (opzionale)", "difficulty":"quick|medium|heavy" }

REGOLE:
- Rispondi in massimo 4-5 righe, citando SEMPRE dati specifici dell'utente.
- Se crei qualcosa, confermalo brevemente nel "reply".
- Se mancano dati per un consiglio, dillo e suggerisci di registrarli.`;
}

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Risposta testuale all\'utente in italiano' },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['create_activity', 'create_goal', 'create_task', 'create_event', 'create_homework'] },
          name: { type: 'string' },
          category: { type: 'string' },
          emoji: { type: 'string' },
          title: { type: 'string' },
          timeframe: { type: 'string' },
          difficulty: { type: 'string' },
          activity_name: { type: 'string' },
          task_type: { type: 'string' },
          due_date: { type: 'string' },
          notes: { type: 'string' },
          subject: { type: 'string' },
        },
      },
    },
  },
  required: ['reply'],
};

export default function FocusyAssistant({ defaultOpen = false, initialPrompt = null }) {
  const t = useT();
  const qc = useQueryClient();
  const [open, setOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionResults, setActionResults] = useState([]);
  const [dailyCount, setDailyCount] = useState(getDailyCount());
  const scrollRef = useRef(null);
  const sentInitialRef = useRef(false);

  const { data: settings } = useUserSettings();
  const { data: activities } = useActivities();
  const { data: ratings } = useRatings();
  const { data: gymSessions } = useGymSessions();
  const { data: bodyFuelEntries } = useBodyFuelEntries();
  const { data: dayEntries } = useDayEntries();
  const { data: lifeStats } = useLifeStats();
  const { data: goals } = useGoals();
  const { data: workDayLogs } = useWorkDayLogs();
  const { data: subjects } = useSubjects();
  const { data: lessonGrades } = useLessonGrades();
  const { data: verifiche } = useVerifiche();
  const { data: gradeGoals } = useGradeGoals();
  const { data: homeworks } = useHomeworks();
  const { tier, isPremium } = useSubscription();

  const limit = LIMITS[tier] ?? LIMITS.free;
  const messagesLeft = isPremium ? Infinity : Math.max(0, limit - dailyCount);
  const canSend = isPremium || dailyCount < limit;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, actionResults]);

  const executeAction = useCallback(async (action) => {
    try {
      if (action.type === 'create_activity') {
        await base44.entities.Activity.create({
          name: action.name,
          category: action.category || 'custom',
          emoji: action.emoji || '⭐',
        });
        qc.invalidateQueries({ queryKey: ['activities'] });
        return { ok: true, label: t('focusy_action_created_activity') };
      }
      if (action.type === 'create_goal') {
        const act = (activities || []).find(a => a.name === action.activity_name);
        if (!act) return { ok: false, label: t('focusy_action_no_activity') };
        await base44.entities.Goal.create({
          activity_id: act.id,
          title: action.title,
          timeframe: action.timeframe || 'daily',
          difficulty: action.difficulty || 'easy',
        });
        qc.invalidateQueries({ queryKey: ['goals'] });
        return { ok: true, label: t('focusy_action_created_goal') };
      }
      if (action.type === 'create_task') {
        await base44.entities.TaskItem.create({
          title: action.title,
          type: action.task_type || 'todo',
          due_date: action.due_date || undefined,
          notes: action.notes || undefined,
          status: 'active',
        });
        qc.invalidateQueries({ queryKey: ['tasks'] });
        return { ok: true, label: t('focusy_action_created_task') };
      }
      if (action.type === 'create_event') {
        await base44.entities.TaskItem.create({
          title: action.title,
          type: action.task_type || 'meeting',
          due_date: action.due_date || undefined,
          notes: action.notes || undefined,
          status: 'active',
        });
        qc.invalidateQueries({ queryKey: ['tasks'] });
        return { ok: true, label: t('focusy_action_created_event') };
      }
      if (action.type === 'create_homework') {
        await base44.entities.Homework.create({
          subject: action.subject,
          title: action.title,
          due_date: action.due_date || undefined,
          difficulty: action.difficulty || 'medium',
          status: 'pending',
        });
        qc.invalidateQueries({ queryKey: ['homeworks'] });
        return { ok: true, label: t('focusy_action_created_homework') };
      }
      return { ok: false, label: t('focusy_action_unknown') };
    } catch (e) {
      console.error('Focusy action error', e);
      return { ok: false, label: t('focusy_action_error') };
    }
  }, [activities, qc, t]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading || !canSend) return;
    const userMsg = { role: 'user', content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setActionResults([]);

    try {
      const context = buildContext({ settings, activities, ratings, gymSessions, bodyFuelEntries, dayEntries, lifeStats, goals, workDayLogs, subjects, lessonGrades, verifiche, gradeGoals, homeworks });
      const conversationHistory = messages.slice(-6).map((m) => `${m.role === 'user' ? 'Utente' : 'Focusy'}: ${m.content}`).join('\n');
      const prompt = `${context}\n\nCONVERSAZIONE:\n${conversationHistory}\nUtente: ${text.trim()}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gpt_5_4',
        response_json_schema: RESPONSE_SCHEMA,
      });

      const reply = response?.reply || 'Scusa, non sono riuscito a rispondere.';
      const actions = response?.actions || [];

      // Execute actions
      const results = [];
      for (const action of actions) {
        const result = await executeAction(action);
        results.push(result);
      }

      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      if (results.length) setActionResults(results);

      const newCount = incDailyCount();
      setDailyCount(newCount);
    } catch (e) {
      console.error('Focusy error', e);
      setMessages((m) => [...m, { role: 'assistant', content: 'Scusa, c\'è stato un errore. Riprova tra un momento.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, canSend, messages, settings, activities, ratings, gymSessions, bodyFuelEntries, dayEntries, lifeStats, goals, workDayLogs, subjects, lessonGrades, verifiche, gradeGoals, homeworks, executeAction]);

  useEffect(() => {
    if (initialPrompt && open && !sentInitialRef.current) {
      sentInitialRef.current = true;
      sendMessage(initialPrompt);
    }
  }, [initialPrompt, open, sendMessage]);

  const runRoutineOptimization = useCallback(async () => {
    if (loading || !canSend) return;
    setLoading(true);
    setActionResults([]);

    setMessages((m) => [...m, { role: 'user', content: t('focusy_sugg_routine') }]);

    try {
      const conversation = await base44.agents.createConversation({
        agent_name: 'routine_optimizer',
        metadata: { name: 'Routine Optimization' },
      });

      await base44.agents.addMessage(conversation, {
        role: 'user',
        content: 'Analizza i miei DayEntry (voti giornalieri, pensieri) e BodyFuelEntry (alimentazione, sonno, peso) e dammi suggerimenti personalizzati per ottimizzare la mia routine quotidiana. Sii specifico e cita i miei dati reali.',
      });

      let lastContent = '';
      let lastUpdateTime = Date.now();

      const unsubscribe = base44.agents.subscribeToConversation(conversation.id, (data) => {
        const msgs = data.messages || [];
        const lastAssistant = [...msgs].reverse().find((m) => m.role === 'assistant');
        if (lastAssistant && lastAssistant.content && lastAssistant.content !== lastContent) {
          lastContent = lastAssistant.content;
          lastUpdateTime = Date.now();
          setMessages((m) => {
            const newMsgs = [...m];
            const idx = newMsgs.findIndex((msg) => msg._routineOpt);
            const msgObj = { role: 'assistant', content: lastContent, _routineOpt: true };
            if (idx >= 0) newMsgs[idx] = msgObj;
            else newMsgs.push(msgObj);
            return newMsgs;
          });
        }
      });

      // Wait for response to stabilize (no updates for 3s) or timeout at 45s
      const startTime = Date.now();
      while (Date.now() - startTime < 45000) {
        await new Promise((r) => setTimeout(r, 1000));
        if (lastContent && Date.now() - lastUpdateTime > 3000) break;
      }

      unsubscribe();
      const newCount = incDailyCount();
      setDailyCount(newCount);
    } catch (e) {
      console.error('Routine optimizer error', e);
      setMessages((m) => [...m, { role: 'assistant', content: 'Scusa, c\'è stato un errore nell\'analisi della routine. Riprova tra un momento.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, canSend, t]);

  const limitLabel = isPremium
    ? t('focusy_unlimited')
    : `${messagesLeft}/${limit} ${t('focusy_messages_left')}`;

  const allSuggestions = [...SUGGESTIONS, ...ACTION_SUGGESTIONS];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-full mt-4 rounded-2xl border border-border bg-gradient-to-br from-foreground/[0.06] to-foreground/[0.02] p-4 flex items-center gap-3 hover:from-foreground/[0.1] hover:to-foreground/[0.04] transition-colors"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
          <Sparkles size={22} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold">Focusy</p>
          <p className="text-xs text-muted-foreground">{t('focusy_subtitle')}</p>
        </div>
        <span className="text-xs font-semibold text-muted-foreground">{t('focusy_open')}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-background/90 backdrop-blur-md"
          >
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', stiffness: 200, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-border bg-card flex flex-col max-h-[85vh] h-[85vh] sm:h-[600px]"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Focusy</p>
                    <p className="text-[11px] text-muted-foreground">{t('focusy_tagline')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-semibold px-2 py-1 rounded-full ${canSend ? 'bg-muted text-muted-foreground' : 'bg-destructive/15 text-destructive'}`}>
                    {limitLabel}
                  </span>
                  <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
                      <Sparkles size={28} />
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1">{t('focusy_welcome_title')}</p>
                      <p className="text-xs text-muted-foreground max-w-[260px]">{t('focusy_welcome_desc')}</p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 w-full mt-2">
                      {allSuggestions.map((s) => (
                        <button
                          key={s.key}
                          onClick={() => s.isRoutine ? runRoutineOptimization() : sendMessage(s.text)}
                          disabled={!canSend}
                          className="text-left rounded-xl border border-border bg-background p-3 text-xs text-foreground hover:bg-accent/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {t(s.key)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-muted' : 'bg-foreground text-background'}`}>
                      {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  </div>
                ))}
                {actionResults.length > 0 && (
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                      <CheckCircle size={14} />
                    </div>
                    <div className="rounded-2xl bg-muted px-3.5 py-2.5 space-y-1">
                      {actionResults.map((r, i) => (
                        <p key={i} className={`text-xs flex items-center gap-1.5 ${r.ok ? 'text-foreground' : 'text-destructive'}`}>
                          {r.ok ? <CheckCircle size={12} /> : <X size={12} />}
                          {r.label}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {loading && (
                  <div className="flex gap-2.5">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                      <Bot size={14} />
                    </div>
                    <div className="rounded-2xl bg-muted px-3.5 py-2.5">
                      <Loader2 size={14} className="animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                {!canSend && !loading && (
                  <div className="flex flex-col items-center gap-2 py-4 text-center">
                    <Lock size={24} className="text-muted-foreground" />
                    <p className="text-xs text-muted-foreground max-w-[240px]">{t('focusy_limit_reached')}</p>
                    <a href="/profilo" className="text-xs font-semibold text-foreground underline">{t('focusy_unlock_more')}</a>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <div className="flex items-center gap-2 rounded-2xl border border-border bg-background pr-2 pl-4">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                    placeholder={canSend ? t('focusy_input_ph') : t('focusy_limit_reached')}
                    disabled={loading || !canSend}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                  />
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={loading || !input.trim() || !canSend}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-30 shrink-0"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}