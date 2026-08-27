import { useState, useEffect, useCallback } from 'react';
import { Lightbulb, Sparkles, Send, ChevronLeft, Check, Clock, X, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { getDB } from '@/lib/guestDB';
import { base44 } from '@/api/base44Client';

const STATUS_CONFIG = {
  pending: { icon: Clock, labelKey: 'dream_status_pending', color: 'text-yellow-500 bg-yellow-500/10' },
  approved: { icon: Check, labelKey: 'dream_status_approved', color: 'text-green-500 bg-green-500/10' },
  implemented: { icon: Star, labelKey: 'dream_status_implemented', color: 'text-foreground bg-foreground/10' },
  rejected: { icon: X, labelKey: 'dream_status_rejected', color: 'text-destructive bg-destructive/10' },
};

export default function DreamFunctionality() {
  const t = useT();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(null); // dream_id being voted on

  const loadIdeas = async () => {
    try {
      const items = await getDB().DreamFunctionality.filter({}, '-created_date', 50);
      setIdeas(items);
    } catch (e) {
      console.error('Load ideas error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdeas();
  }, []);

  const handleVote = useCallback(async (dreamId, vote) => {
    if (voting) return;
    setVoting(dreamId);
    try {
      const res = await base44.functions.invoke('vote-dream', { dream_id: dreamId, vote });
      const data = res?.data || res;
      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea.id !== dreamId) return idea;
          return {
            ...idea,
            liked_by: vote === 'like' && data?.user_vote === 'like'
              ? [...(idea.liked_by || []), user?.id].filter((v, i, a) => v && a.indexOf(v) === i)
              : (idea.liked_by || []).filter((id) => id !== user?.id),
            disliked_by: vote === 'dislike' && data?.user_vote === 'dislike'
              ? [...(idea.disliked_by || []), user?.id].filter((v, i, a) => v && a.indexOf(v) === i)
              : (idea.disliked_by || []).filter((id) => id !== user?.id),
          };
        })
      );
    } catch (e) {
      console.error('Vote error:', e);
    } finally {
      setVoting(null);
    }
  }, [voting, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setSubmitting(true);
    try {
      await getDB().DreamFunctionality.create({
        title: title.trim(),
        description: description.trim(),
        status: 'pending',
      });
      setTitle('');
      setDescription('');
      await loadIdeas();
    } catch (e) {
      console.error('Submit idea error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="px-5 safe-top pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-bold tracking-tight">{t('dream_title')}</h1>
      </div>

      {/* Reward banner */}
      <div className="rounded-2xl border border-foreground/20 bg-foreground/5 p-4 mb-6">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-foreground/10 flex items-center justify-center shrink-0">
            <Sparkles size={18} className="text-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold mb-0.5">{t('dream_reward_title')}</p>
            <p className="text-xs text-muted-foreground">{t('dream_desc')}</p>
          </div>
        </div>
      </div>

      {/* Submit form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-border bg-card p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-muted-foreground" />
          <span className="text-sm font-semibold">{t('dream_submit_title')}</span>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('dream_your_title')}
          maxLength={80}
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-foreground text-sm font-medium outline-none mb-2"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t('dream_your_desc')}
          maxLength={500}
          rows={4}
          className="w-full rounded-xl border border-border bg-background px-3 py-3 text-foreground text-sm outline-none mb-3 resize-none"
        />
        <button
          type="submit"
          disabled={!title.trim() || !description.trim() || submitting}
          className="w-full rounded-xl bg-foreground py-3 text-sm font-semibold text-background disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Send size={16} /> {submitting ? '...' : t('dream_submit')}
        </button>
      </form>

      {/* Past submissions */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('dream_your_ideas')}</p>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
          </div>
        ) : ideas.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <Lightbulb size={24} className="mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t('dream_no_ideas')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {ideas.map((idea) => {
              const config = STATUS_CONFIG[idea.status] || STATUS_CONFIG.pending;
              const StatusIcon = config.icon;
              const likedBy = idea.liked_by || [];
              const dislikedBy = idea.disliked_by || [];
              const userLiked = user?.id && likedBy.includes(user.id);
              const userDisliked = user?.id && dislikedBy.includes(user.id);
              const isVoting = voting === idea.id;
              return (
                <div key={idea.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold">{idea.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color} shrink-0`}>
                      <StatusIcon size={10} /> {t(config.labelKey)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{idea.description}</p>
                  {idea.credits_awarded && (
                    <div className="mb-3 flex items-center gap-1.5 text-xs text-green-500">
                      <Sparkles size={12} /> {t('dream_credits_earned')}
                    </div>
                  )}
                  {/* Like / Dislike */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => handleVote(idea.id, 'like')}
                      disabled={isVoting}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        userLiked ? 'bg-green-500/20 text-green-500' : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsUp size={13} className={userLiked ? 'fill-green-500/20' : ''} />
                      {likedBy.length}
                    </button>
                    <button
                      onClick={() => handleVote(idea.id, 'dislike')}
                      disabled={isVoting}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
                        userDisliked ? 'bg-red-500/20 text-red-500' : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <ThumbsDown size={13} className={userDisliked ? 'fill-red-500/20' : ''} />
                      {dislikedBy.length}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}