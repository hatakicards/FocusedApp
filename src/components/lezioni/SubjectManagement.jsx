import { useState } from 'react';
import { Plus, Trash2, BookOpen } from 'lucide-react';
import { useSubjects, useOptimisticSubjectSave, useOptimisticSubjectDelete } from '@/lib/useAppData';
import { useT } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function SubjectManagement({ open, onClose }) {
  const t = useT();
  const { data: subjects } = useSubjects();
  const optimisticSave = useOptimisticSubjectSave();
  const optimisticDelete = useOptimisticSubjectDelete();
  const [newName, setNewName] = useState('');

  const handleAdd = async () => {
    if (!newName.trim()) return;
    const name = newName.trim();
    setNewName('');
    await optimisticSave(null, { name });
  };

  const handleDelete = async (id) => {
    await optimisticDelete(id);
  };

  const sorted = [...(subjects || [])].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen size={18} /> {t('ls_materie')}
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <p className="text-sm text-muted-foreground mb-3">{t('ls_materie_sub')}</p>

          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t('ls_materia_name')}
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40 active:scale-95 transition-all"
            >
              <Plus size={16} /> {t('aggiungi')}
            </button>
          </div>

          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('ls_no_materie')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-hide">
              {sorted.map((s) => (
                <div key={s.id} className="flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2.5">
                  <span className="text-sm font-medium truncate">{s.name}</span>
                  <button onClick={() => handleDelete(s.id)} className="text-muted-foreground hover:text-destructive shrink-0 ml-2 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}