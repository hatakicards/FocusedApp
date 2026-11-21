import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Calendar, BookOpen, GraduationCap } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useLessonGrades, useVerifiche, useInvalidateAll, useUserSettings, useTasks, useSubjects, useOptimisticLessonGradeSave, useOptimisticLessonGradeDelete, useOptimisticVerificaSave, useOptimisticVerificaUpdate, useOptimisticVerificaDelete, useSubscription } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { GRADE_SYSTEMS, formatGrade, formatGradeNumber, normalizeGrade } from '@/lib/grades';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import TutorialDialog from '@/components/TutorialDialog';
import TestTimeline from '@/components/lezioni/TestTimeline';
import SubjectManagement from '@/components/lezioni/SubjectManagement';
import { GradeInput, resolveGrade } from '@/components/lezioni/GradeInput';
import GradeSystemPicker from '@/components/lezioni/GradeSystemPicker';
import SubjectPicker from '@/components/lezioni/SubjectPicker';
import TimetableTab from '@/components/lezioni/TimetableTab';
import LockedPreview from '@/components/LockedPreview';
import { useTourTab } from '@/lib/planWelcome';

function LezioniInner() {
  const navigate = useNavigate();
  const { data: grades } = useLessonGrades();
  const { data: verifiche } = useVerifiche();
  const { data: settings } = useUserSettings();
  const { data: tasks } = useTasks();
  const { data: managedSubjects } = useSubjects();
  const invalidate = useInvalidateAll();
  const optimisticGradeSave = useOptimisticLessonGradeSave();
  const optimisticGradeDelete = useOptimisticLessonGradeDelete();
  const optimisticVerificaSave = useOptimisticVerificaSave();
  const optimisticVerificaUpdate = useOptimisticVerificaUpdate();
  const optimisticVerificaDelete = useOptimisticVerificaDelete();
  const t = useT();
  const { locale } = useI18n();
  const sub = useSubscription();
  const today = todayISO();

  const [tab, setTab] = useState('voti');
  useTourTab('lezioni', setTab);

  const [subject, setSubject] = useState('');
  const [gradeVal, setGradeVal] = useState('');
  const [system, setSystem] = useState('scale10');
  const [editGrade, setEditGrade] = useState(null);

  const [vSubject, setVSubject] = useState('');
  const [vDate, setVDate] = useState(today);
  const [vTopic, setVTopic] = useState('');
  const [gradeVerifica, setGradeVerifica] = useState(null);
  const [vGrade, setVGrade] = useState('');
  const [vSystem, setVSystem] = useState('scale10');
  const [materieOpen, setMaterieOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [selSubjectRaw, setSelSubject] = useState('');

  const allGrades = grades || [];
  const allVerifiche = verifiche || [];

  const subjects = [...new Set([
    ...(managedSubjects || []).map((s) => s.name).filter(Boolean),
    ...allGrades.map((g) => g.subject).filter(Boolean),
    ...allVerifiche.map((v) => v.subject).filter(Boolean),
  ])].sort();

  // Materie selezionabili: solo quelle aggiunte con il pulsante "Materie" (piu', per non
  // perdere i voti vecchi, quella gia' associata al voto che si sta modificando).
  const pickSubjects = [...new Set((managedSubjects || []).map((s) => s.name).filter(Boolean))].sort();
  const withCurrent = (current) => (current && !pickSubjects.includes(current) ? [...pickSubjects, current].sort() : pickSubjects);

  const sortedGrades = [...allGrades].sort((a, b) => b.date.localeCompare(a.date));

  const avgNormalized = allGrades.length
    ? allGrades.reduce((sum, g) => sum + normalizeGrade(g.grade, g.grade_system), 0) / allGrades.length
    : 0;

  const subjectCharts = subjects.map((subj) => {
    const data = [...allGrades]
      .filter((g) => g.subject === subj)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14)
      .map((g) => ({
        date: new Date(g.date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
        voto: Math.round(normalizeGrade(g.grade, g.grade_system)),
      }));
    return { subject: subj, data };
  }).filter((s) => s.data.length >= 1);

  // Materia scelta a tendina: se non hai ancora scelto, quella del voto piu' recente.
  const selSubject = selSubjectRaw || sortedGrades[0]?.subject || '';
  const subjGrades = sortedGrades.filter((g) => g.subject === selSubject);
  const subjAvg = subjGrades.length
    ? subjGrades.reduce((sum, g) => sum + normalizeGrade(g.grade, g.grade_system), 0) / subjGrades.length
    : 0;
  const subjChart = subjectCharts.find((c) => c.subject === selSubject)?.data || [];

  const upcomingVerifiche = allVerifiche
    .filter((v) => v.status === 'scheduled')
    .sort((a, b) => a.date.localeCompare(b.date));
  const pastVerifiche = allVerifiche
    .filter((v) => v.status !== 'scheduled')
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddGrade = async () => {
    if (!subject.trim() || !gradeVal) return;
    const numericGrade = resolveGrade(gradeVal, system);
    if (numericGrade == null) return;
    const subj = subject.trim();
    setSubject('');
    setGradeVal('');
    await optimisticGradeSave(null, {
      date: today,
      subject: subj,
      grade: numericGrade,
      grade_system: system,
    });
  };

  const handleEditGradeSave = async () => {
    if (!editGrade) return;
    const numericGrade = resolveGrade(editGrade.grade, editGrade.grade_system);
    if (numericGrade == null) return;
    setEditGrade(null);
    await optimisticGradeSave(editGrade, {
      subject: editGrade.subject,
      grade: numericGrade,
      grade_system: editGrade.grade_system,
    });
  };

  const handleDeleteGrade = async (id) => {
    await optimisticGradeDelete(id);
  };

  const handleAddVerifica = async () => {
    if (!vSubject.trim() || !vDate) return;
    const subj = vSubject.trim();
    const topic = vTopic.trim();
    const date = vDate;
    setVSubject('');
    setVTopic('');
    setVDate(today);
    await optimisticVerificaSave(null, {
      subject: subj,
      date,
      topic,
      status: 'scheduled',
    });
  };

  const handleCompleteVerifica = async (v) => {
    if (!vGrade) return;
    const numericGrade = resolveGrade(vGrade, vSystem);
    if (numericGrade == null) return;
    setGradeVerifica(null);
    setVGrade('');
    await optimisticVerificaUpdate(v.id, {
      status: 'completed',
      grade: numericGrade,
      grade_system: vSystem,
    });
  };

  const handleDeleteVerifica = async (id) => {
    await optimisticVerificaDelete(id);
  };

  const handleOpenFocus = (homework) => {
    navigate('/focus', { state: { prefillFromHomeworkId: homework.id } });
  };

  return (
    <div className="px-5 safe-top pb-4">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('personal_study')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('personal_study_sub')}</p>
        </div>
        <button
          data-tour="materie"
          onClick={() => setMaterieOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-foreground/10 px-3 py-2 text-xs font-semibold hover:bg-foreground/15 transition-all active:scale-95"
        >
          <BookOpen size={14} /> {t('ls_materie')}
        </button>
      </header>

      <div data-tour="lezioni-tabs" className="mb-6 flex gap-1 overflow-x-auto rounded-full bg-foreground/[0.06] p-1 scrollbar-hide">
        {['voti', 'verifiche', 'orario'].map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-semibold transition-colors ${tab === tabKey ? 'bg-foreground text-background shadow-sm' : 'text-muted-foreground'}`}
          >
            {t('ls_tab_' + tabKey)}
          </button>
        ))}
      </div>

      {tab === 'voti' && (
        <>
          {/* Media generale, grande, con il + per aggiungere un voto */}
          <div className="relative mb-5 overflow-hidden rounded-3xl border border-border bg-card p-6 pb-7">
            <span className="pointer-events-none absolute -left-16 -top-16 h-44 w-44 rounded-full opacity-25 blur-3xl" style={{ background: '#3b82f6' }} />
            <p className="relative text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{t('ls_media_generale')}</p>
            <p className="relative mt-2 flex items-baseline gap-1.5">
              <span className="titanium-text text-7xl font-extrabold leading-none tabular-nums">{allGrades.length ? Math.round(avgNormalized) : '–'}</span>
              <span className="text-lg font-semibold text-muted-foreground">/100</span>
            </p>
            <p className="relative mt-2 text-xs text-muted-foreground">{allGrades.length} {t('lsn_voti_count')}</p>
            <button
              onClick={() => { setSubject(selSubject || ''); setAddOpen(true); }}
              aria-label={t('ls_aggiungi')}
              className="titanium-bg absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform active:scale-90"
            >
              <Plus size={22} strokeWidth={2.4} />
            </button>
          </div>

          {/* Materia a tendina: grafico, media e storico di quella materia */}
          {subjects.length > 0 && (
            <div className="mb-4">
              <SubjectPicker subjects={subjects} value={selSubject} onChange={setSelSubject} onManage={() => setMaterieOpen(true)} placeholder={t('lsn_scegli_materia')} />
            </div>
          )}

          {selSubject && (
            <>
              <div className="mb-4 rounded-2xl border border-border bg-card p-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <p className="truncate text-sm font-semibold">{selSubject}</p>
                  <p className="shrink-0 text-2xl font-bold tabular-nums" style={{ color: '#60a5fa' }}>
                    {subjGrades.length ? Math.round(subjAvg) : '–'}<span className="text-xs font-semibold text-muted-foreground">/100</span>
                  </p>
                </div>
                {subjChart.length >= 1 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <LineChart data={subjChart}>
                      <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} />
                      <Tooltip
                        contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                        labelStyle={{ color: 'hsl(0 0% 45%)' }}
                      />
                      <Line type="monotone" dataKey="voto" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-6 text-center text-xs text-muted-foreground">{t('lsn_nessun_voto_materia')}</p>
                )}
              </div>

              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('storico')}</p>
              {subjGrades.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">{t('nessun_dato')}</p>
              ) : (
                <div className="space-y-2">
                  {subjGrades.map((g) => {
                    const gSys = GRADE_SYSTEMS[g.grade_system] || GRADE_SYSTEMS.scale10;
                    return (
                      <div key={g.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium capitalize">{new Date(g.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                          <p className="text-xs text-muted-foreground">{gSys.label}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-bold tabular-nums" style={{ color: '#60a5fa' }}>{formatGrade(g.grade, g.grade_system)}</span>
                          <button onClick={() => setEditGrade(g)} className="text-muted-foreground hover:text-foreground" aria-label={t('modifica')}>
                            <Pencil size={16} />
                          </button>
                          <button onClick={() => handleDeleteGrade(g.id)} className="text-muted-foreground hover:text-destructive" aria-label={t('elimina')}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Aggiungi voto */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('lsn_nuovo_voto')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <SubjectPicker subjects={pickSubjects} value={subject} onChange={setSubject} onManage={() => { setAddOpen(false); setMaterieOpen(true); }} />
                <GradeSystemPicker value={system} onChange={(v) => { setSystem(v); setGradeVal(''); }} />
                <div className="flex gap-2">
                  <GradeInput system={system} value={gradeVal} onChange={setGradeVal} placeholder={t('ls_voto_ph')} />
                </div>
              </div>
              <DialogFooter>
                <button onClick={() => setAddOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  {t('annulla')}
                </button>
                <button
                  onClick={async () => { const s = subject; await handleAddGrade(); setAddOpen(false); if (s) setSelSubject(s); }}
                  disabled={!subject.trim() || resolveGrade(gradeVal, system) == null}
                  className="flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-all active:scale-95 disabled:opacity-40"
                >
                  <Plus size={16} /> {t('ls_aggiungi')}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={!!editGrade} onOpenChange={(v) => !v && setEditGrade(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('modifica')}</DialogTitle>
              </DialogHeader>
              {editGrade && (
                <div className="space-y-3 py-2">
                  <SubjectPicker
                    subjects={withCurrent(editGrade.subject)}
                    value={editGrade.subject || ''}
                    onChange={(v) => setEditGrade({ ...editGrade, subject: v })}
                    onManage={() => setMaterieOpen(true)}
                  />
                  <GradeSystemPicker
                    value={editGrade.grade_system || 'scale10'}
                    onChange={(v) => setEditGrade({ ...editGrade, grade_system: v, grade: '' })}
                  />
                  <div className="flex gap-2">
                    <GradeInput
                      system={editGrade.grade_system || 'scale10'}
                      value={editGrade.grade != null ? formatGradeNumber(editGrade.grade) : ''}
                      onChange={(v) => setEditGrade({ ...editGrade, grade: v })}
                      placeholder={t('ls_voto_ph')}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <button onClick={() => setEditGrade(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  {t('annulla')}
                </button>
                <button onClick={handleEditGradeSave} className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background active:scale-95 transition-all">
                  {t('salva')}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === 'verifiche' && (
        <>
          <div className="mb-6">
            <TestTimeline verifiche={allVerifiche} locale={locale} />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('ls_programma')}</p>
            <div className="space-y-2">
              <SubjectPicker subjects={pickSubjects} value={vSubject} onChange={setVSubject} onManage={() => setMaterieOpen(true)} />
              <input
                type="date"
                value={vDate}
                onChange={(e) => setVDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
              <input
                type="text"
                value={vTopic}
                onChange={(e) => setVTopic(e.target.value)}
                placeholder={t('ls_argomento_ph')}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
            </div>
            <button
              onClick={handleAddVerifica}
              disabled={!vSubject.trim() || !vDate}
              className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={16} /> {t('ls_programma')}
            </button>
          </div>

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('ls_prossime')}</p>
          {upcomingVerifiche.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('ls_nessuna_verifica')}</p>
          ) : (
            <div className="space-y-2 mb-6">
              {upcomingVerifiche.map((v) => {
                const testDate = new Date(v.date + 'T00:00:00');
                const isPast = testDate < new Date(new Date().toDateString());
                return (
                  <div key={v.id} className="rounded-xl border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.subject}</p>
                        {v.topic && <p className="text-xs text-muted-foreground truncate">{v.topic}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize flex items-center gap-1">
                          <Calendar size={11} />
                          {testDate.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setGradeVerifica(v);
                            setVGrade('');
                            setVSystem('scale10');
                          }}
                          className="rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background"
                        >
                          {t('ls_completa')}
                        </button>
                        <button onClick={() => handleDeleteVerifica(v.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {isPast && (
                      <p className="text-[10px] text-amber-500 mt-1">{t('ag_scaduto')}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {pastVerifiche.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('ls_passate')}</p>
              <div className="space-y-2">
                {pastVerifiche.map((v) => {
                  const gSys = GRADE_SYSTEMS[v.grade_system] || GRADE_SYSTEMS.scale10;
                  return (
                    <div key={v.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{v.subject}</p>
                        {v.topic && <p className="text-xs text-muted-foreground truncate">{v.topic}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                          {new Date(v.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        {v.grade != null && (
                          <span className="text-lg font-bold tabular-nums text-blue-500">{formatGrade(v.grade, v.grade_system)}</span>
                        )}
                        <button onClick={() => handleDeleteVerifica(v.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <Dialog open={!!gradeVerifica} onOpenChange={(v) => !v && setGradeVerifica(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('ls_voto_verifica')}</DialogTitle>
              </DialogHeader>
              {gradeVerifica && (
                <div className="space-y-3 py-2">
                  <p className="text-sm text-muted-foreground">{gradeVerifica.subject}{gradeVerifica.topic ? ` — ${gradeVerifica.topic}` : ''}</p>
                  <GradeSystemPicker value={vSystem} onChange={(v) => { setVSystem(v); setVGrade(''); }} />
                  <div className="flex gap-2">
                    <GradeInput system={vSystem} value={vGrade} onChange={setVGrade} placeholder={t('ls_voto_ph')} />
                  </div>
                </div>
              )}
              <DialogFooter>
                <button onClick={() => setGradeVerifica(null)} className="rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground">
                  {t('annulla')}
                </button>
                <button
                  onClick={() => gradeVerifica && handleCompleteVerifica(gradeVerifica)}
                  disabled={resolveGrade(vGrade, vSystem) == null}
                  className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40 active:scale-95 transition-all"
                >
                  {t('salva')}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === 'orario' && (
        <TimetableTab subjects={pickSubjects} onManageSubjects={() => setMaterieOpen(true)} />
      )}


      <SubjectManagement open={materieOpen} onClose={() => setMaterieOpen(false)} />
      <TutorialDialog pageId="lezioni" />
    </div>
  );
}

export default function Lezioni() {
  const sub = useSubscription();
  return (
    <LockedPreview locked={!sub.canUseProfiles} tier="premium" descKey="gate_personal_desc">
      <LezioniInner />
    </LockedPreview>
  );
}
