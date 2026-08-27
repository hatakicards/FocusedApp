import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT } from '@/lib/i18n';

export default function MacroChartDialog({ open, onClose, title, data, color }) {
  const t = useT();
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {data.length >= 1 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={35} />
              <Tooltip
                contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: 'hsl(0 0% 45%)' }}
              />
              <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">{t('nessun_dato')}</p>
        )}
      </DialogContent>
    </Dialog>
  );
}