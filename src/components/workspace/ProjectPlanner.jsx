import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, Bot, User, Loader2, CheckCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useT, useI18n, weekdayShortByMonSun } from '@/lib/i18n';
import { useInvalidateAll } from '@/lib/useAppData';
import { base44 } from '@/api/base44Client';

const PROJECT_PLAN_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: 'Risposta testuale in italiano: domanda di chiarimento o presentazione del piano' },
    ready_to_propose: { type: 'boolean' },
    plan: {
      type: 'object',
      properties: {
        activity: {
          type: 'object',
          properties: { name: { type: 'string' }, emoji: { type: 'string' } },
          required: ['name'],
        },
        goals: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              timeframe: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'annual', 'lifetime'] },
              difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] },
            },
            required: ['title', 'timeframe', 'difficulty'],
          },
        },
        weekly_session: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            recurrence_per_week: { type: 'integer' },
            weekdays: { type: 'array', items: { type: 'string', enum: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] } },
            notes: { type: 'string' },
          },
          required: ['title', 'recurrence_per_week', 'weekdays'],
        },
        project: {
          type: 'object',
          properties: { title: { type: 'string' }, objective: { type: 'string' } },
          required: ['title', 'objective'],
        },
      },
      required: ['activity', 'goals', 'weekly_session', 'project'],
    },
  },
  required: ['reply', 'ready_to_propose'],
};

function buildPrompt(messages) {
  const firstUserMsg = messages.find((m) => m.role === 'user')?.content || '';
  const history = messages.map((m) => `${m.role === 'user' ? 'Utente' : 'Focusy'}: ${m.content}`).join('\n');
  return `Sei Focusy, l'assistente dell'app Focused. L'utente ha un profilo PROFESSIONISTA e vuole pianificare un progetto lavorativo.

OBIETTIVO INIZIALE DICHIARATO DALL'UTENTE:
"${firstUserMsg}"

REGOLE:
- Fai UNA o DUE domande di chiarimento alla volta, mai di più. Argomenti da coprire prima di proporre un piano (in quest'ordine, salta quelli già chiari dalla conversazione):
  1. Quanto tempo a settimana l'utente può dedicare al progetto
  2. Quali giorni della settimana preferisce lavorarci
  3. Se esiste una scadenza o deadline
  4. Il suo livello di esperienza/partenza sull'argomento
- Non proporre MAI il piano finale se non hai almeno una risposta chiara su tempo disponibile e giorni preferiti.
- Quando hai abbastanza informazioni, imposta ready_to_propose:true e compila "plan" con:
  - activity: un nome breve che rappresenti il progetto come abitudine ricorrente, più un emoji
  - goals: 2-4 obiettivi concreti collegati, con timeframe e difficulty
  - weekly_session: UNA sessione settimanale ricorrente basata su quanto dichiarato dall'utente (recurrence_per_week coerente col numero di weekdays)
  - project: title (breve) e objective (la descrizione estesa dell'obiettivo, riassunta bene)
- Finché non sei pronto, ready_to_propose:false e "plan" assente: fai solo la prossima domanda in "reply".
- Rispondi sempre in italiano, tono diretto e pratico, 2-4 righe.

CONVERSAZIONE FINORA:
${history}`;
}

export default function ProjectPlanner({ open, onClose }) {
  const t = useT();
  const { locale } = useI18n();
  const navigate = useNavigate();
  const invalidate = useInvalidateAll();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingPlan, setPendingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState(null);
  const [partialError, setPartialError] = useState(null);
  const createdActivityRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setPendingPlan(null);
      setError(null);
      setPartialError(null);
      createdActivityRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, pendingPlan, error]);

  const sendMessage = async (text) => {
    if (!text.trim() || loading) return;
    const nextMessages = [...messages, { role: 'user', content: text.trim() }];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);
    setPendingPlan(null);

    try {
      const prompt = buildPrompt(nextMessages);
      const res = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'gpt_5_4',
        response_json_schema: PROJECT_PLAN_SCHEMA,
      });

      const reply = res?.reply || '';
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);

      if (res?.ready_to_propose && res?.plan) {
        setPendingPlan(res.plan);
      }
    } catch (e) {
      console.error('ProjectPlanner sendMessage error', e);
      setMessages((m) => [...m, { role: 'assistant', content: t('wpp_error') }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingPlan) return;
    setCreating(true);
    setPartialError(null);
    try {
      let activity = createdActivityRef.current;
      if (!activity) {
        setCreateStep('activity');
        activity = await base44.entities.Activity.create({
          name: pendingPlan.activity.name,
          category: 'work',
          emoji: pendingPlan.activity.emoji || '💼',
        });
        createdActivityRef.current = activity;
      }

      setCreateStep('goals');
      for (const g of pendingPlan.goals) {
        await base44.entities.Goal.create({
          activity_id: activity.id,
          title: g.title,
          timeframe: g.timeframe,
          difficulty: g.difficulty,
        });
      }

      setCreateStep('task');
      await base44.entities.TaskItem.create({
        title: pendingPlan.weekly_session.title,
        type: 'weekly',
        notes: pendingPlan.weekly_session.notes || undefined,
        recurrence_per_week: pendingPlan.weekly_session.recurrence_per_week,
        weekdays: pendingPlan.weekly_session.weekdays,
        linked_activity_id: activity.id,
        repeatable: false,
        expected_earnings: 0,
      });

      setCreateStep('project');
      await base44.entities.Project.create({
        title: pendingPlan.project.title,
        objective: pendingPlan.project.objective,
        status: 'active',
        linked_activity_id: activity.id,
      });

      invalidate();
      onClose();
    } catch (e) {
      console.error('ProjectPlanner create error', e);
      setPartialError({ activityCreated: !!createdActivityRef.current, activityId: createdActivityRef.current?.id });
    } finally {
      setCreating(false);
      setCreateStep(null);
    }
  };

  const creatingLabel = {
    activity: t('wpp_creating_activity'),
    goals: t('wpp_creating_goals'),
    task: t('wpp_creating_task'),
    project: t('wpp_creating_project'),
  }[createStep];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !creating && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles size={18} /> {t('wpp_title')}
          </DialogTitle>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 py-2 max-h-[50vh]">
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground">{t('wpp_intro_placeholder')}</p>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.role === 'user' ? 'bg-muted' : 'bg-foreground text-background'}`}>
                {m.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${m.role === 'user' ? 'bg-foreground text-background' : 'bg-muted text-foreground'}`}>
                <p className="whitespace-pre-wrap">{m.content}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <Bot size={14} />
              </div>
              <div className="rounded-2xl bg-muted px-3.5 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 size={13} className="animate-spin" /> {t('wpp_thinking')}
              </div>
            </div>
          )}
        </div>

        {pendingPlan && (
          <div className="rounded-2xl border border-foreground/20 bg-foreground/5 p-4 space-y-3 mt-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('wpp_plan_title')}</p>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('wpp_plan_activity')}</p>
              <p className="text-sm font-semibold">{pendingPlan.activity.emoji ? `${pendingPlan.activity.emoji} ` : ''}{pendingPlan.activity.name}</p>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('wpp_plan_goals')}</p>
              <div className="space-y-1.5">
                {pendingPlan.goals.map((g, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-background px-2.5 py-1.5">
                    <span className="text-xs truncate">{g.title}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                      {t('tf_' + g.timeframe)} · {t('diff_' + g.difficulty)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{t('wpp_plan_session')}</p>
              <p className="text-xs">
                {pendingPlan.weekly_session.title} — {pendingPlan.weekly_session.recurrence_per_week}×/sett. ({pendingPlan.weekly_session.weekdays.map((d) => weekdayShortByMonSun(locale, d)).join(', ')})
              </p>
            </div>

            {partialError ? (
              <div className="rounded-xl bg-destructive/10 p-3 space-y-2">
                <p className="text-xs text-destructive">
                  {partialError.activityCreated
                    ? t('wpp_partial_error').replace('{name}', pendingPlan.activity.name)
                    : t('wpp_full_error')}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    disabled={creating}
                    className="flex-1 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background disabled:opacity-40"
                  >
                    {t('wpp_retry')}
                  </button>
                  {partialError.activityCreated && (
                    <button
                      onClick={() => navigate('/attivita/' + partialError.activityId)}
                      className="flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold"
                    >
                      {t('ws_project_open')}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setPendingPlan(null)}
                  disabled={creating}
                  className="flex-1 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold disabled:opacity-40"
                >
                  {t('wpp_continue')}
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={creating}
                  className="flex-1 rounded-xl bg-foreground px-3 py-2.5 text-xs font-semibold text-background disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                  {creating ? creatingLabel : t('wpp_confirm_create')}
                </button>
              </div>
            )}
          </div>
        )}

        {!pendingPlan && (
          <div className="flex items-center gap-2 rounded-2xl border border-border bg-background pr-2 pl-4 mt-2 shrink-0">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
              placeholder={t('wpp_intro_placeholder')}
              disabled={loading}
              className="flex-1 bg-transparent text-sm outline-none py-2.5 placeholder:text-muted-foreground disabled:opacity-50"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-30 shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
