import { useMemo, useState } from 'react';
import { ChevronDown, Hourglass, KeyRound } from 'lucide-react';
import { useT } from '@/lib/i18n';
import {
  useBodyFuelEntries, useUserSettings, useTimetable, useSubjects, useGymSessions, useActivities, useWorkDayLogs,
} from '@/lib/useAppData';
import { computeProjectTime, fmtHours } from '@/lib/projectTime';

// In cima a Projects: quanto tempo al giorno hai davvero per i tuoi progetti, calcolato da
// sonno, scuola e studio, lavoro, palestra e attivita'. Poi l'incoraggiamento: anche poche ore
// al giorno, in un anno, sono tantissime.
export default function ProjectTimeCard({ className = '' }) {
  const t = useT();
  const { data: bodyFuelEntries } = useBodyFuelEntries();
  const { data: settings } = useUserSettings();
  const { data: timetable } = useTimetable();
  const { data: subjects } = useSubjects();
  const { data: gymSessions } = useGymSessions();
  const { data: activities } = useActivities();
  const { data: workDayLogs } = useWorkDayLogs();
  const [open, setOpen] = useState(false);

  const r = useMemo(
    () => computeProjectTime({ bodyFuelEntries, settings, timetable, subjects, gymSessions, activities, workDayLogs }),
    [bodyFuelEntries, settings, timetable, subjects, gymSessions, activities, workDayLogs],
  );

  return (
    <div className={`relative overflow-hidden rounded-3xl border border-border bg-card p-5 ${className}`}>
      <span className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: '#10b981' }} />
      <p className="relative flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        <Hourglass size={13} style={{ color: '#10b981' }} /> {t('pt2_title')}
      </p>
      <p className="relative mt-2 text-sm text-muted-foreground">{t('pt2_you_have')}</p>
      <p className="relative mt-1 flex items-baseline gap-2">
        <span className="titanium-text text-6xl font-extrabold leading-none tabular-nums">{fmtHours(r.project)}</span>
        <span className="text-sm font-semibold text-muted-foreground">{t('pt2_per_day')}</span>
      </p>

      <p className="relative mt-4 text-[15px] font-semibold leading-snug">
        {t('pt2_not_few').replace('{n}', r.perYear.toLocaleString())}
      </p>
      <p className="relative mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
        <KeyRound size={15} className="shrink-0" style={{ color: '#10b981' }} /> {t('pt2_key')}
      </p>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="relative mt-4 flex items-center gap-1 text-xs font-semibold text-muted-foreground"
      >
        {t('pt2_how')} <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="relative mt-3 space-y-1.5">
          {r.parts.map((p) => (
            <div key={p.key} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {t('pt2_part_' + p.key)}
                {p.key === 'sleep' && !p.measured ? ` (${t('pt2_recommended')})` : ''}
                {p.key === 'activities' ? ` (${p.count})` : ''}
              </span>
              <span className="font-semibold tabular-nums">{fmtHours(p.hours)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border pt-1.5 text-xs">
            <span className="text-muted-foreground">{t('pt2_free')}</span>
            <span className="font-semibold tabular-nums">{fmtHours(r.free)}</span>
          </div>
          <p className="pt-1 text-[11px] leading-snug text-muted-foreground">{t('pt2_note')}</p>
        </div>
      )}
    </div>
  );
}
