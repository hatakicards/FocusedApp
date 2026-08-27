import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Pencil, Calendar, Monitor, BookOpen } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useLessonGrades, useVerifiche, useInvalidateAll, useUserSettings, useTasks, useSubjects, useOptimisticLessonGradeSave, useOptimisticLessonGradeDelete, useOptimisticVerificaSave, useOptimisticVerificaUpdate, useOptimisticVerificaDelete } from '@/lib/useAppData';
import { todayISO } from '@/lib/productivity';
import { useT, useI18n } from '@/lib/i18n';
import { GRADE_SYSTEMS, formatGrade, normalizeGrade } from '@/lib/grades';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import BottomSelect from '@/components/BottomSelect';
import TutorialDialog from '@/components/TutorialDialog';
import GradeSimulator from '@/components/lezioni/GradeSimulator';
import SubjectThresholds from '@/components/lezioni/SubjectThresholds';
import TestTimeline from '@/components/lezioni/TestTimeline';
import RecoveryTasks from '@/components/lezioni/RecoveryTasks';
import SubjectManagement from '@/components/lezioni/SubjectManagement';
import HomeworkTab from '@/components/lezioni/HomeworkTab';
import GradeGoals from '@/components/lezioni/GradeGoals';
import StudyOrganizer from '@/components/lezioni/StudyOrganizer';
import { GradeInput, resolveGrade } from '@/components/lezioni/GradeInput';
import FocusyAssistant from '@/components/FocusyAssistant';

export default function Lezioni() {
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
  const today = todayISO();

  const [tab, setTab] = useState('voti');

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
  const [askFocusy, setAskFocusy] = useState(false);

  const allGrades = grades || [];
  const allVerifiche = verifiche || [];

  const subjects = [...new Set([
    ...(managedSubjects || []).map((s) => s.name).filter(Boolean),
    ...allGrades.map((g) => g.subject).filter(Boolean),
    ...allVerifiche.map((v) => v.subject).filter(Boolean),
  ])].sort();

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
        <div className="flex items-center gap-2">
          <Monitor size={22} className="text-blue-500" />
          <h1 className="text-2xl font-bold tracking-tight">{t('msd_title')}</h1>
        </div>
        <button
          onClick={() => setMaterieOpen(true)}
          className="flex items-center gap-1.5 rounded-xl bg-foreground/10 px-3 py-2 text-xs font-semibold hover:bg-foreground/15 transition-all active:scale-95"
        >
          <BookOpen size={14} /> {t('ls_materie')}
        </button>
      </header>

      <div className="flex gap-2 mb-6 p-1 rounded-2xl bg-card border border-border overflow-x-auto scrollbar-hide">
        {['voti', 'verifiche', 'compiti', 'obiettivi', 'organizza', 'simulatore'].map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-colors ${tab === tabKey ? 'bg-foreground text-background' : 'text-muted-foreground'}`}
          >
            {t('ls_tab_' + tabKey)}
          </button>
        ))}
      </div>

      <datalist id="subjects-list">
        {subjects.map((s) => <option key={s} value={s} />)}
      </datalist>

      {tab === 'voti' && (
        <>
          {allGrades.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-4 mb-6 text-center">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('ls_media_generale')}</p>
              <p className="text-3xl font-bold tabular-nums">{Math.round(avgNormalized)}<span className="text-base text-muted-foreground">/100</span></p>
            </div>
          )}

          {settings && (
            <SubjectThresholds grades={allGrades} settings={settings} onSaved={invalidate} />
          )}

          <RecoveryTasks grades={allGrades} tasks={tasks} onCreated={invalidate} />

          {subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {subjects.map((s) => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${subject === s ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground'}`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 mb-6">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('ls_oggi')}</p>
            <div className="space-y-2">
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('ls_materia_ph')}
                list="subjects-list"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
              <div className="flex gap-2">
                <div className="shrink-0 w-32">
                  <BottomSelect
                    value={system}
                    onValueChange={(v) => { setSystem(v); setGradeVal(''); }}
                    options={Object.entries(GRADE_SYSTEMS).map(([k, v]) => ({ value: k, label: v.label }))}
                  />
                </div>
                <GradeInput system={system} value={gradeVal} onChange={setGradeVal} placeholder={t('ls_voto_ph')} />
              </div>
            </div>
            <button
              onClick={handleAddGrade}
              disabled={!subject.trim() || !gradeVal}
              className="mt-3 w-full rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Plus size={16} /> {t('ls_aggiungi')}
            </button>
          </div>

          {subjectCharts.map((sc) => (
            <div key={sc.subject} className="rounded-2xl border border-border bg-card p-4 mb-4">
              <p className="text-xs font-semibold mb-3">{sc.subject}</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={sc.data}>
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(0 0% 45%)" width={30} />
                  <Tooltip
                    contentStyle={{ background: 'hsl(0 0% 4%)', border: '1px solid hsl(0 0% 14%)', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: 'hsl(0 0% 45%)' }}
                  />
                  <Line type="monotone" dataKey="voto" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6' }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}

          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">{t('storico')}</p>
          {sortedGrades.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('nessun_dato')}</p>
          ) : (
            <div className="space-y-2">
              {sortedGrades.map((g) => {
                const gSys = GRADE_SYSTEMS[g.grade_system] || GRADE_SYSTEMS.scale10;
                return (
                  <div key={g.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{g.subject}</p>
                      <p className="text-xs text-muted-foreground capitalize">{new Date(g.date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' })} · {gSys.label}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold tabular-nums text-blue-500">{formatGrade(g.grade, g.grade_system)}</span>
                      <button onClick={() => setEditGrade(g)} className="text-muted-foreground hover:text-foreground">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDeleteGrade(g.id)} className="text-muted-foreground hover:text-destructive">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <Dialog open={!!editGrade} onOpenChange={(v) => !v && setEditGrade(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('modifica')}</DialogTitle>
              </DialogHeader>
              {editGrade && (
                <div className="space-y-3 py-2">
                  <input
                    type="text"
                    value={editGrade.subject || ''}
                    onChange={(e) => setEditGrade({ ...editGrade, subject: e.target.value })}
                    placeholder={t('ls_materia_ph')}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
                  />
                  <div className="flex gap-2">
                    <div className="shrink-0 w-32">
                      <BottomSelect
                        value={editGrade.grade_system || 'scale10'}
                        onValueChange={(v) => setEditGrade({ ...editGrade, grade_system: v, grade: '' })}
                        options={Object.entries(GRADE_SYSTEMS).map(([k, v]) => ({ value: k, label: v.label }))}
                      />
                    </div>
                    <GradeInput
                      system={editGrade.grade_system || 'scale10'}
                      value={editGrade.grade != null ? String(editGrade.grade) : ''}
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
              <input
                type="text"
                value={vSubject}
                onChange={(e) => setVSubject(e.target.value)}
                placeholder={t('ls_materia_ph')}
                list="subjects-list"
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none [color-scheme:dark]"
              />
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
                  <div className="flex gap-2">
                    <div className="shrink-0 w-32">
                      <BottomSelect
                        value={vSystem}
                        onValueChange={(v) => { setVSystem(v); setVGrade(''); }}
                        options={Object.entries(GRADE_SYSTEMS).map(([k, val]) => ({ value: k, label: val.label }))}
                      />
                    </div>
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
                  disabled={!vGrade}
                  className="rounded-xl bg-foreground px-4 py-2.5 text-sm font-semibold text-background disabled:opacity-40 active:scale-95 transition-all"
                >
                  {t('salva')}
                </button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}

      {tab === 'compiti' && (
        <HomeworkTab subjects={subjects} onOpenFocus={handleOpenFocus} />
      )}

      {tab === 'obiettivi' && (
        <GradeGoals subjects={subjects} grades={allGrades} verifiche={allVerifiche} />
      )}

      {tab === 'organizza' && (
        <StudyOrganizer
          grades={allGrades}
          verifiche={allVerifiche}
          onOpenFocus={handleOpenFocus}
          onAskFocusy={() => setAskFocusy(true)}
        />
      )}

      {tab === 'simulatore' && (
        <GradeSimulator grades={allGrades} />
      )}

      {askFocusy && (
        <FocusyAssistant defaultOpen initialPrompt={t('so_focusy_prompt')} />
      )}

      <SubjectManagement open={materieOpen} onClose={() => setMaterieOpen(false)} />
      <TutorialDialog pageId="lezioni" />
    </div>
  );
}