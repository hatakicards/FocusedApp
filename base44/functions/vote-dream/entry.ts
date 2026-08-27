import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const dreamId = body?.dream_id;
    const vote = body?.vote; // 'like' | 'dislike'

    if (!dreamId || !['like', 'dislike'].includes(vote)) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // Fetch the dream as service role (RLS update is admin-only)
    const dream = await base44.asServiceRole.entities.DreamFunctionality.get(dreamId);
    if (!dream) return Response.json({ error: 'Dream not found' }, { status: 404 });

    const likedBy = Array.isArray(dream.liked_by) ? [...dream.liked_by] : [];
    const dislikedBy = Array.isArray(dream.disliked_by) ? [...dream.disliked_by] : [];

    const userId = user.id;
    const alreadyLiked = likedBy.includes(userId);
    const alreadyDisliked = dislikedBy.includes(userId);

    if (vote === 'like') {
      if (alreadyLiked) {
        // Toggle off
        const idx = likedBy.indexOf(userId);
        if (idx >= 0) likedBy.splice(idx, 1);
      } else {
        // Switch from dislike or add new
        if (alreadyDisliked) {
          const idx = dislikedBy.indexOf(userId);
          if (idx >= 0) dislikedBy.splice(idx, 1);
        }
        likedBy.push(userId);
      }
    } else {
      // dislike
      if (alreadyDisliked) {
        // Toggle off
        const idx = dislikedBy.indexOf(userId);
        if (idx >= 0) dislikedBy.splice(idx, 1);
      } else {
        // Switch from like or add new
        if (alreadyLiked) {
          const idx = likedBy.indexOf(userId);
          if (idx >= 0) likedBy.splice(idx, 1);
        }
        dislikedBy.push(userId);
      }
    }

    await base44.asServiceRole.entities.DreamFunctionality.update(dreamId, {
      liked_by: likedBy,
      disliked_by: dislikedBy,
    });

    return Response.json({
      dream_id: dreamId,
      likes: likedBy.length,
      dislikes: dislikedBy.length,
      user_vote: likedBy.includes(userId) ? 'like' : dislikedBy.includes(userId) ? 'dislike' : null,
    });
  } catch (error) {
    console.error('vote-dream error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}