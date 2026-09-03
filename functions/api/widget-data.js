import { getSupabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { computeFocusScore, computeLongestStreak, computeCategoryRank, todayISO } from '../../src/lib/productivity.js';
import { CATEGORIES } from '../../src/lib/constants.js';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// Dati compatti per i widget nativi (iOS WidgetKit / Android Glance) — stessi
// numeri mostrati in app, calcolati con le stesse funzioni di src/lib/productivity.js.
// Il widget gira in un processo separato dalla WebView, quindi non puo' leggere
// nulla dall'app: deve chiedere questi dati direttamente a questo endpoint.
export async function onRequestGet({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const user = await getUserFromRequest(request, supabaseAdmin);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const [activitiesRes, ratingsRes, dayEntriesRes, goalsRes, tasksRes, gymSessionsRes, settingsRes] = await Promise.all([
      supabaseAdmin.from('activity').select('id, category').eq('created_by_id', user.id),
      supabaseAdmin.from('daily_rating').select('activity_id, date, rating').eq('created_by_id', user.id),
      supabaseAdmin.from('day_entry').select('date, day_rating').eq('created_by_id', user.id),
      supabaseAdmin.from('goal').select('activity_id, difficulty, timeframe, completed, completed_periods').eq('created_by_id', user.id),
      supabaseAdmin.from('task_item').select('id, title, type, due_date').eq('created_by_id', user.id).eq('status', 'active').order('due_date', { ascending: true, nullsFirst: false }).limit(10),
      supabaseAdmin.from('gym_session').select('day_of_week, title, exercises').eq('created_by_id', user.id),
      supabaseAdmin.from('user_settings').select('gym_enabled').eq('created_by_id', user.id).order('created_date', { ascending: false }).limit(1),
    ]);
    for (const res of [activitiesRes, ratingsRes, dayEntriesRes, goalsRes, tasksRes, gymSessionsRes, settingsRes]) {
      if (res.error) throw res.error;
    }

    const activities = activitiesRes.data || [];
    const ratings = ratingsRes.data || [];
    const dayEntries = dayEntriesRes.data || [];
    const goals = goalsRes.data || [];
    const tasks = tasksRes.data || [];
    const gymSessions = gymSessionsRes.data || [];
    const settings = settingsRes.data?.[0] || null;

    const focusScore = computeFocusScore(ratings, dayEntries, goals);

    const streak = activities.reduce((max, a) => {
      const aRatings = ratings.filter((r) => r.activity_id === a.id);
      return Math.max(max, computeLongestStreak(aRatings));
    }, 0);

    const ranks = CATEGORIES.map((cat) => {
      const { rank } = computeCategoryRank(cat.id, activities, ratings, goals);
      return { category: cat.id, rankId: rank?.id || null };
    });

    const todayWeekday = WEEKDAY_IDS[new Date().getDay()];
    const todayGym = settings?.gym_enabled
      ? gymSessions.find((s) => s.day_of_week === todayWeekday)
      : null;

    return jsonResponse({
      focusScore,
      streak,
      ranks,
      tasks: tasks.map((t) => ({ id: t.id, title: t.title, type: t.type, dueDate: t.due_date })),
      gym: todayGym ? { title: todayGym.title, exerciseCount: (todayGym.exercises || []).length } : null,
      date: todayISO(),
    });
  } catch (error) {
    console.error('widget-data error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
