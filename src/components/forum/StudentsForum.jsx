import { useState } from 'react';
import { MessageSquare, Plus, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useT } from '@/lib/i18n';
import ForumPostForm from './ForumPostForm';
import ForumPostCard from './ForumPostCard';

export default function StudentsForum() {
  const t = useT();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const { data: posts, isLoading } = useQuery({
    queryKey: ['forumPosts'],
    queryFn: () => base44.entities.ForumPost.list('-created_date', 100),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['forumPosts'] });
    setShowForm(false);
  };

  const handleDelete = async (id) => {
    await base44.entities.ForumPost.delete(id);
    refresh();
  };

  const filtered = (posts || []).filter((p) => filterType === 'all' || p.post_type === filterType);

  const filterTabs = [
    { id: 'all', label: t('forum_filter_all') },
    { id: 'notes', label: t('forum_type_notes') },
    { id: 'explanation', label: t('forum_type_explanation') },
    { id: 'question', label: t('forum_type_question') },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare size={20} className="text-blue-400" />
          <h2 className="text-lg font-bold">{t('forum_title')}</h2>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 rounded-xl bg-foreground px-3 py-2 text-xs font-semibold text-background"
        >
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? t('chiudi') : t('forum_new_post')}
        </button>
      </div>

      {showForm && <ForumPostForm onCreated={refresh} />}

      <div className="flex gap-2 mb-4 overflow-x-auto scrollbar-hide">
        {filterTabs.map((ft) => (
          <button
            key={ft.id}
            onClick={() => setFilterType(ft.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filterType === ft.id ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'
            }`}
          >
            {ft.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">{t('forum_empty')}</p>
        </div>
      ) : (
        <div>
          {filtered.map((post) => (
            <ForumPostCard key={post.id} post={post} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </div>
  );
}