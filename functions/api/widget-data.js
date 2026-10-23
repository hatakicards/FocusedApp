import { getSupabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { computeFocusScore, computeFocusScoreForDate, computeLongestStreak, computeCategoryRank } from '../../src/lib/productivity.js';
import { CATEGORIES, GYM_IMAGE_URL } from '../../src/lib/constants.js';

// Giorno e giorno della settimana nel fuso dell'utente: il server gira in UTC, quindi dopo
// mezzanotte "oggi" sarebbe sbagliato e la scheda palestra risultava sempre "nessuna".
// Il widget manda il suo fuso con ?tz=; i widget gia' installati non lo mandano e si usa
// quello italiano.
function localDay(tz) {
  let zone = tz || 'Europe/Rome';
  try { new Intl.DateTimeFormat('en-CA', { timeZone: zone }); } catch { zone = 'Europe/Rome'; }
  const now = new Date();
  const iso = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(now).toLowerCase();
  return { iso, weekday };
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

// Dati compatti per i widget nativi (iOS WidgetKit / Android Glance) — stessi
// numeri mostrati in app, calcolati con le stesse funzioni di src/lib/productivity.js.
// Il widget gira in un processo separato dalla WebView, quindi non puo' leggere
// nulla dall'app: deve chiedere questi dati direttamente a questo endpoint.
export async function onRequestGet({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const user = await getUserFromRequest(request, supabaseAdmin);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { iso: today, weekday: todayWeekday } = localDay(new URL(request.url).searchParams.get('tz'));
    // v=2 (widget nuovi): include anche le attivita' gia' spuntate oggi; i widget vecchi vedono solo quelle aperte.
    const wantsDone = new URL(request.url).searchParams.get('v') === '2';
    const [activitiesRes, ratingsRes, dayEntriesRes, goalsRes, tasksRes, doneTasksRes, gymSessionsRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('activity').select('id, category').eq('created_by_id', user.id),
      supabaseAdmin.from('daily_rating').select('activity_id, date, rating').eq('created_by_id', user.id),
      supabaseAdmin.from('day_entry').select('date, day_rating').eq('created_by_id', user.id),
      supabaseAdmin.from('goal').select('activity_id, difficulty, timeframe, completed, completed_periods').eq('created_by_id', user.id),
      supabaseAdmin.from('task_item').select('id, title, type, due_date, due_time').eq('created_by_id', user.id).eq('status', 'active').or(`due_date.is.null,due_date.lte.${today}`).order('due_time', { ascending: true, nullsFirst: false }).limit(12),
      supabaseAdmin.from('task_item').select('id, title, type, due_date, due_time').eq('created_by_id', user.id).eq('status', 'done').eq('completed_date', today).limit(12),
      supabaseAdmin.from('gym_session').select('day_of_week, title, exercises').eq('created_by_id', user.id),
      supabaseAdmin.from('user_settings').select('gym_enabled').eq('created_by_id', user.id).order('created_date', { ascending: false }).limit(1),
    ]);
    for (const res of [activitiesRes, ratingsRes, dayEntriesRes, goalsRes, tasksRes, doneTasksRes, gymSessionsRes, settingsRes]) {
      if (res.error) throw res.error;
    }

    const activities = activitiesRes.data || [];
    const ratings = ratingsRes.data || [];
    const dayEntries = dayEntriesRes.data || [];
    const goals = goalsRes.data || [];
    const pendingTasks = tasksRes.data || [];
    const doneTasks = doneTasksRes.data || [];
    const gymSessions = gymSessionsRes.data || [];
    const settings = settingsRes.data?.[0] || null;

    const focusScore = computeFocusScore(ratings, dayEntries, goals);
    const focusScoreHistory = Array.from({ length: 7 }, (_, i) => isoDaysAgo(6 - i)).map((date) => ({
      date,
      score: computeFocusScoreForDate(ratings, dayEntries, goals, date),
    }));

    const streak = activities.reduce((max, a) => {
      const aRatings = ratings.filter((r) => r.activity_id === a.id);
      return Math.max(max, computeLongestStreak(aRatings));
    }, 0);

    const ranks = CATEGORIES.map((cat) => {
      const { rank } = computeCategoryRank(cat.id, activities, ratings, goals);
      return { category: cat.id, rankId: rank?.id || null };
    });

    // Se ci sono piu' righe per lo stesso giorno (duplicati) vale quella con piu' esercizi. Non
    // serve l'interruttore gym_enabled: basta una scheda salvata, come nell'app.
    const exerciseCount = (s) => (s.exercises || []).filter((e) => e?.name?.trim()).length;
    const todayGym = gymSessions
      .filter((s) => s.day_of_week === todayWeekday && exerciseCount(s) > 0)
      .sort((a, b) => exerciseCount(b) - exerciseCount(a))[0] || null;

    return jsonResponse({
      focusScore,
      focusScoreHistory,
      streak,
      ranks,
      // Da fare oggi: prima quelle ancora aperte (per orario), poi quelle gia' spuntate oggi.
      tasks: [
        ...pendingTasks.map((t) => ({ id: t.id, title: t.title, type: t.type, dueDate: t.due_date, dueTime: t.due_time, done: false })),
        ...(wantsDone ? doneTasks : []).map((t) => ({ id: t.id, title: t.title, type: t.type, dueDate: t.due_date, dueTime: t.due_time, done: true })),
      ],
      tasksDone: wantsDone ? doneTasks.length : null,
      tasksTotal: wantsDone ? pendingTasks.length + doneTasks.length : null,
      gym: todayGym ? { title: todayGym.title, exerciseCount: exerciseCount(todayGym), imageUrl: GYM_IMAGE_URL } : null,
      date: today,
    });
  } catch (error) {
    console.error('widget-data error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
