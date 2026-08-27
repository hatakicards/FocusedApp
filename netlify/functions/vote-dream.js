import { supabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';

export default async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const body = await req.json();
    const dreamId = body?.dream_id;
    const vote = body?.vote; // 'like' | 'dislike'

    if (!dreamId || !['like', 'dislike'].includes(vote)) {
      return jsonResponse({ error: 'Invalid parameters' }, 400);
    }

    // Lettura/scrittura come service role: la RLS permette update solo agli
    // admin, ma votare deve poterlo fare qualunque utente autenticato.
    const { data: dream, error: getErr } = await supabaseAdmin
      .from('dream_functionality')
      .select('*')
      .eq('id', dreamId)
      .maybeSingle();
    if (getErr) throw getErr;
    if (!dream) return jsonResponse({ error: 'Dream not found' }, 404);

    const likedBy = Array.isArray(dream.liked_by) ? [...dream.liked_by] : [];
    const dislikedBy = Array.isArray(dream.disliked_by) ? [...dream.disliked_by] : [];

    const userId = user.id;
    const alreadyLiked = likedBy.includes(userId);
    const alreadyDisliked = dislikedBy.includes(userId);

    if (vote === 'like') {
      if (alreadyLiked) {
        likedBy.splice(likedBy.indexOf(userId), 1);
      } else {
        if (alreadyDisliked) dislikedBy.splice(dislikedBy.indexOf(userId), 1);
        likedBy.push(userId);
      }
    } else {
      if (alreadyDisliked) {
        dislikedBy.splice(dislikedBy.indexOf(userId), 1);
      } else {
        if (alreadyLiked) likedBy.splice(likedBy.indexOf(userId), 1);
        dislikedBy.push(userId);
      }
    }

    const { error: updErr } = await supabaseAdmin
      .from('dream_functionality')
      .update({ liked_by: likedBy, disliked_by: dislikedBy })
      .eq('id', dreamId);
    if (updErr) throw updErr;

    return jsonResponse({
      dream_id: dreamId,
      likes: likedBy.length,
      dislikes: dislikedBy.length,
      user_vote: likedBy.includes(userId) ? 'like' : dislikedBy.includes(userId) ? 'dislike' : null,
    });
  } catch (error) {
    console.error('vote-dream error:', error);
    return jsonResponse({ error: error.message }, 500);
  }
};
