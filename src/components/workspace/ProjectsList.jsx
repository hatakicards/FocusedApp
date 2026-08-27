import { useNavigate } from 'react-router-dom';
import { Briefcase, ExternalLink, Trash2, Plus } from 'lucide-react';
import { useProjects, useGoals, useOptimisticProjectUpdate, useOptimisticProjectDelete } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import BottomSelect from '@/components/BottomSelect';

const STATUS_STYLES = {
  planning: 'bg-muted text-muted-foreground',
  active: 'bg-emerald-500/15 text-emerald-500',
  paused: 'bg-amber-500/15 text-amber-500',
  completed: 'bg-blue-500/15 text-blue-400',
};

export default function ProjectsList({ onNewProject }) {
  const t = useT();
  const navigate = useNavigate();
  const { data: projects } = useProjects();
  const { data: goals } = useGoals();
  const optimisticUpdate = useOptimisticProjectUpdate();
  const optimisticDelete = useOptimisticProjectDelete();

  const all = [...(projects || [])].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));

  const handleStatusChange = async (project, status) => {
    await optimisticUpdate(project.id, { status });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('ws_project_delete_confirm'))) return;
    await optimisticDelete(id);
  };

  const statusOptions = ['planning', 'active', 'paused', 'completed'].map((s) => ({
    value: s,
    label: t('ws_project_status_' + s),
  }));

  if (all.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <Briefcase size={28} className="mx-auto mb-3 text-muted-foreground" />
        <p className="text-sm text-muted-foreground mb-4">{t('ws_projects_empty')}</p>
        <button
          onClick={onNewProject}
          className="inline-flex items-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background"
        >
          <Plus size={16} /> {t('ws_new_project')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {all.map((p) => {
        const projectGoals = (goals || []).filter((g) => g.activity_id === p.linked_activity_id);
        const doneGoals = projectGoals.filter((g) => g.completed).length;
        return (
          <div key={p.id} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{p.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{p.objective}</p>
              </div>
              <button onClick={() => handleDelete(p.id)} className="text-muted-foreground hover:text-destructive shrink-0">
                <Trash2 size={16} />
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-1 rounded-full ${STATUS_STYLES[p.status] || STATUS_STYLES.planning}`}>
                {t('ws_project_status_' + p.status)}
              </span>
              {projectGoals.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  {t('ws_project_goals_progress').replace('{done}', doneGoals).replace('{total}', projectGoals.length)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-3">
              <div className="flex-1">
                <BottomSelect
                  value={p.status}
                  onValueChange={(v) => handleStatusChange(p, v)}
                  options={statusOptions}
                />
              </div>
              {p.linked_activity_id && (
                <button
                  onClick={() => navigate('/attivita/' + p.linked_activity_id)}
                  className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold shrink-0"
                >
                  <ExternalLink size={13} /> {t('ws_project_open')}
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button
        onClick={onNewProject}
        className="w-full flex items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 text-sm font-semibold text-muted-foreground hover:text-foreground hover:border-foreground/40 transition-colors"
      >
        <Plus size={16} /> {t('ws_new_project')}
      </button>
    </div>
  );
}
