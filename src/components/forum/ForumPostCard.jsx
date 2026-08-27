import { useState } from 'react';
import { FileText, Lightbulb, HelpCircle, Trash2, User, Share2 } from 'lucide-react';
import { Image } from '@/components/ui/image';
import { useAuth } from '@/lib/AuthContext';
import { useT, useI18n } from '@/lib/i18n';

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

export default function ForumPostCard({ post, onDelete }) {
  const t = useT();
  const { locale } = useI18n();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  const Icon = TYPE_ICONS[post.post_type] || FileText;
  const colorClass = TYPE_COLORS[post.post_type] || 'text-blue-400';
  const isOwner = user?.id === post.created_by_id;
  const date = new Date(post.created_date).toLocaleDateString(locale, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  const handleShare = async () => {
    const url = `${window.location.origin}/forum/${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ url });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Link copiato!');
      }
    } catch (e) { /* ignore */ }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 mb-3">
      <div className="flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${colorClass}`}>
          <Icon size={18} />
        </div>
        <div className="min-w-0 flex-1">
          {post.title && (
            <p className="text-sm font-semibold mb-1">{post.title}</p>
          )}
          <p className={`text-sm text-muted-foreground ${expanded ? '' : 'line-clamp-3'}`}>
            {post.content}
          </p>
          {post.content.length > 150 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-foreground/60 mt-1"
            >
              {expanded ? t('forum_collapse') : t('forum_expand')}
            </button>
          )}

          {post.images && post.images.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {post.images.map((url, i) => (
                <div
                  key={i}
                  className="w-20 h-20 rounded-lg overflow-hidden border border-border cursor-pointer"
                  onClick={() => window.open(url, '_blank')}
                >
                  <Image src={url} fittingType="fill" className="w-full h-full" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
              {post.anonymous ? (
                <>
                  <User size={10} /> {t('forum_anon_short')}
                </>
              ) : (
                <>
                  <User size={10} /> {post.author_name || t('forum_anon_short')}
                </>
              )}
            </span>
            <span className="text-[10px] text-muted-foreground">· {date}</span>
            {post.school_year && (
              <span className="text-[10px] text-muted-foreground">· {post.school_year}</span>
            )}
            <button
              onClick={handleShare}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <Share2 size={14} />
            </button>
            {isOwner && onDelete && (
              <button
                onClick={() => onDelete(post.id)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}