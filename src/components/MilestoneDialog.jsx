import { useT } from '@/lib/i18n';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import MilestoneIcon from '@/components/MilestoneIcon';

export default function MilestoneDialog({ milestone, onClose }) {
  const t = useT();

  return (
    <Dialog open={!!milestone} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xs">
        {milestone && (
          <div className="flex flex-col items-center gap-4 pt-2">
            <div className="w-28 h-28 rounded-xl overflow-hidden flex items-center justify-center">
              <MilestoneIcon icon={milestone.icon} unlocked={milestone.unlocked} size={112} />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-bold">{t(milestone.titleKey)}</h2>
              <p className="text-sm text-muted-foreground mt-1">{t(milestone.reqKey)}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}