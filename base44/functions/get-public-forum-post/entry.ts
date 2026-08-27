import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const body = await req.json();
    const postId = body?.post_id;
    if (!postId || typeof postId !== 'string') {
      return Response.json({ error: 'Missing post_id' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const post = await base44.asServiceRole.entities.ForumPost.get(postId);
    return Response.json({ post });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}