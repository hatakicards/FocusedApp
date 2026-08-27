import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { useAuth } from '@/lib/AuthContext';
import { useGymSessions } from '@/lib/useAppData';
import { useI18n, useT, weekdayLongById } from '@/lib/i18n';
import DaySelector, { DAYS } from '@/components/gym/DaySelector';
import GymSessionCard from '@/components/gym/GymSessionCard';

export default function GymScheduleEditor({ open, onClose }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { locale } = useI18n();
  const t = useT();
  const { data: sessions } = useGymSessions();
  const [pendingDay, setPendingDay] = useState(null);

  const sessionByDay = new Map();
  (sessions || []).forEach((s) => {
    const k = s.day_of_week;
    if (!k) return;
    const cur = sessionByDay.get(k);
    if (!cur) { sessionByDay.set(k, s); return; }
    const ea = (s.exercises || []).filter((e) => e && e.name && e.name.trim()).length;
    const eb = (cur.exercises || []).filter((e) => e && e.name && e.name.trim()).length;
    const better = ea !== eb ? ea > eb : (s.updated_date || '').localeCompare(cur.updated_date || '') > 0;
    if (better) sessionByDay.set(k, s);
  });
  const selectedDays = new Set(sessionByDay.keys());
  const orderedSessions = DAYS.map((d) => sessionByDay.get(d.id)).filter(Boolean);

  useEffect(() => {
    if (!sessions || sessions.length === 0) return;
    const byDay = {};
    sessions.forEach((s) => {
      if (!s.day_of_week) return;
      (byDay[s.day_of_week] ||= []).push(s);
    });
    const toDelete = [];
    Object.values(byDay).forEach((list) => {
      if (list.length <= 1) return;
      const survivor = list.sort((a, b) => {
        const ea = (a.exercises || []).filter((e) => e && e.name && e.name.trim()).length;
        const eb = (b.exercises || []).filter((e) => e && e.name && e.name.trim()).length;
        if (eb !== ea) return eb - ea;
        return (b.updated_date || '').localeCompare(a.updated_date || '');
      })[0];
      list.forEach((s) => { if (s.id !== survivor.id) toDelete.push(s.id); });
    });
    if (toDelete.length === 0) return;
    getDB().GymSession.deleteMany({ id: { $in: toDelete } })
      .then(() => qc.invalidateQueries(['gymSessions']))
      .catch(console.error);
  }, [sessions, qc]);

  const handleToggle = async (day) => {
    if (pendingDay === day) return;
    const key = ['gymSessions', user?.id];
    const prev = qc.getQueryData(key) || [];
    const forDay = prev.filter((s) => s.day_of_week === day);

    if (forDay.length > 0) {
      // Optimistic: remove from cache immediately
      qc.setQueryData(key, prev.filter((s) => s.day_of_week !== day));
      try {
        await getDB().GymSession.deleteMany({ id: { $in: forDay.map((s) => s.id) } });
      } catch (e) {
        qc.setQueryData(key, prev); // rollback
      }
    } else {
      // Optimistic: add temp session immediately
      const tempId = `temp-${Date.now()}`;
      const tempSession = { id: tempId, day_of_week: day, title: '', exercises: [] };
      qc.setQueryData(key, [...prev, tempSession]);
      try {
        const created = await getDB().GymSession.create({ day_of_week: day, title: '', exercises: [] });
        const cur = qc.getQueryData(key) || [];
        qc.setQueryData(key, cur.map((s) => (s.id === tempId ? created : s)));
      } catch (e) {
        qc.setQueryData(key, prev); // rollback
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('gse_titolo')}</DialogTitle>
        </DialogHeader>

        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('gse_giorni')}</p>
          <DaySelector selected={selectedDays} onToggle={handleToggle} pending={pendingDay} />
        </div>

        {orderedSessions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('gse_seleziona')}</p>
        ) : (
          <div className="space-y-5 mt-2">
            {orderedSessions.map((s) => {
              const dayLabel = weekdayLongById(locale, s.day_of_week);
              return (
                <div key={s.id}>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 capitalize">{dayLabel}</h3>
                  <GymSessionCard session={s} />
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}