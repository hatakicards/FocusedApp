import { getSupabaseAdmin, jsonResponse } from './_shared/supabaseAdmin.js';

export async function onRequestPost({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const body = await request.json();
    const postId = body?.post_id;
    if (!postId || typeof postId !== 'string') {
      return jsonResponse({ error: 'Missing post_id' }, 400);
    }

    const { data: post, error } = await supabaseAdmin
      .from('forum_post')
      .select('*')
      .eq('id', postId)
      .maybeSingle();
    if (error) throw error;

    return jsonResponse({ post });
  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}
