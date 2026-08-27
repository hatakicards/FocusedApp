import { Dumbbell } from 'lucide-react';
import { useI18n, useT, weekdayLongById } from '@/lib/i18n';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const WEEKDAY_IDS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function GymSessionDialog({ session, onClose }) {
  const t = useT();
  const { locale } = useI18n();

  if (!session) return null;

  const dayName = weekdayLongById(locale, session.day_of_week);
  const exercises = session.exercises || [];

  return (
    <Dialog open={!!session} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell size={18} />
            <span>{session.title || t('gsc_allenamento')}</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground capitalize -mt-2">{dayName}</p>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-hide">
          {exercises.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">{t('gt_nessun_es')}</p>
          ) : (
            exercises.map((ex, i) => (
              <div key={i} className="rounded-xl border border-border bg-background p-3">
                <p className="text-sm font-medium">{ex.name}</p>
                {ex.info && <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{ex.info}</p>}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}