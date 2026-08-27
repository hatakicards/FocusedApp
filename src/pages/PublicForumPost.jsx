import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Lightbulb, HelpCircle, User, ArrowLeft, MessageSquare } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Image } from '@/components/ui/image';

const TYPE_ICONS = {
  notes: FileText,
  explanation: Lightbulb,
  question: HelpCircle,
};

const TYPE_COLORS = {
  notes: 'text-blue-400',
  explanation: 'text-green-400',
  question: 'text-amber-400',
};

export default function PublicForumPost() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const res = await base44.functions.invoke('get-public-forum-post', { post_id: id });
        setPost(res.data.post);
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 text-center">
        <MessageSquare size={40} className="text-muted-foreground/40 mb-4" />
        <p className="text-sm text-muted-foreground mb-4">Post non trovato.</p>
        <Link to="/" className="text-sm text-foreground underline">Torna alla home</Link>
      </div>
    );
  }

  const Icon = TYPE_ICONS[post.post_type] || FileText;
  const colorClass = TYPE_COLORS[post.post_type] || 'text-blue-400';
  const date = new Date(post.created_date).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-5 safe-top pb-8">
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 mt-2">
          <ArrowLeft size={16} /> Focused
        </Link>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 mt-0.5 ${colorClass}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0 flex-1">
              {post.title && (
                <h1 className="text-lg font-bold mb-2">{post.title}</h1>
              )}
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{post.content}</p>

              {post.images && post.images.length > 0 && (
                <div className="flex gap-2 mt-4 flex-wrap">
                  {post.images.map((url, i) => (
                    <div
                      key={i}
                      className="w-24 h-24 rounded-lg overflow-hidden border border-border cursor-pointer"
                      onClick={() => window.open(url, '_blank')}
                    >
                      <Image src={url} fittingType="fill" className="w-full h-full" />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 mt-4 flex-wrap">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <User size={12} />
                  {post.anonymous ? 'Anonimo' : (post.author_name || 'Anonimo')}
                </span>
                <span className="text-xs text-muted-foreground">· {date}</span>
                {post.school_year && (
                  <span className="text-xs text-muted-foreground">· {post.school_year}</span>
                )}
                {post.school_system && (
                  <span className="text-xs text-muted-foreground">· {post.school_system}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/register"
            className="inline-block rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background"
          >
            Unisciti a Focused
          </Link>
        </div>
      </div>
    </div>
  );
}