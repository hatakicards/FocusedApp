import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Send, X, Bot, User, Loader2, CheckCircle, Briefcase } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useT } from '@/lib/i18n';
import { useQueryClient } from '@tanstack/react-query';
import { useGoals, useTasks } from '@/lib/useAppData';

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: "Risposta testuale in italiano, concreta e pratica per far avanzare il progetto" },
    actions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['create_task'] },
          title: { type: 'string' },
          due_date: { type: 'string' },
          notes: { type: 'string' },
        },
      },
    },
  },
  required: ['reply'],
};

const STARTERS = [
  'ptw_starter_start',
  'ptw_starter_stuck',
  'ptw_starter_next',
  'ptw_starter_recap',
];

function buildProjectContext(project, goals, tasks) {
  const projectGoals = (goals || []).filter((g) => g.activity_id === project.linked_activity_id);
  const projectTasks = (tasks || [])
    .filter((t) => t.linked_activity_id === project.linked_activity_id && t.status !== 'done')
    .slice(0, 10);

  const goalsSummary = projectGoals.length
    ? projectGoals.map((g) => `  - "${g.title}" (${g.timeframe}/${g.difficulty}) — ${g.completed ? 'completato' : 'in corso'}`).join('\n')
    : '  nessun obiettivo collegato';

  const tasksSummary = projectTasks.length
    ? projectTasks.map((t) => `  - ${t.title}${t.due_date ? ` (scadenza ${t.due_date})` : ''}`).join('\n')
    : '  nessun task pendente';

  return `Sei Focusy, l'assistente IA dell'app Focused, dedicato in questo momento SOLO al progetto "${project.title}". Rispondi sempre in italiano, in modo pratico, concreto e diretto — massimo 4-5 righe. Il tuo scopo è aiutare l'utente a portare avanti e completare questo specifico progetto: suggerisci prossimi passi concreti, aiutalo a sbloccarsi se è fermo, discuti idee, scomponi il lavoro in step piccoli e fattibili.

=== PROGETTO ===
Titolo: ${project.title}
Obiettivo: ${project.objective || 'non specificato'}
Stato: ${project.status}

=== OBIETTIVI COLLEGATI ===
${goalsSummary}

=== TASK/MINI-TARGET PENDENTI ===
${tasksSummary}

CREAZIONE MINI-TARGET: se l'utente chiede di aggiungere un task/mini-target/promemoria per questo progetto, compila l'array "actions" con { "type":"create_task", "title":"...", "due_date":"YYYY-MM-DD (opzionale)", "notes":"(opzionale)" }. Altrimenti lascia "actions": [].`;
}

export default function ProjectWorkChat({ project, open, onClose }) {
  const t = useT();
  const qc = useQueryClient();
  const { data: goals } = useGoals();
  const { data: tasks } = useTasks();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [actionResults, setActionResults] = useState([]);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setMessages([]);
      setInput('');
      setActionResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading, actionResults]);

  const executeAction = useCallback(async (action) => {
    try {
      if (action.type === 'create_task') {
        await base44.entities.TaskItem.create({
          title: action.title,
          type: 'todo',
          due_date: action.due_date || undefined,
          notes: action.notes || undefined,
          status: 'active',
          linked_activity_id: project.linked_activity_id,
        });
        qc.invalidateQueries({ queryKey: ['tasks'] });
        return { ok: true, label: t('focusy_action_created_task') };
      }
      return { ok: false, label: t('focusy_action_unknown') };
    } catch (e) {
      console.error('ProjectWorkChat action error', e);
      return { ok: false, label: t('focusy_action_error') };
    }
  }, [project, qc, t]);

  const sendMessage = useCallback(async (text) => {
    if (!text.trim() || loading || !project) return;
    const userMsg = { role: 'user', content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput('');
    setLoading(true);
    setActionResults([]);

    try {
      const context = buildProjectContext(project, goals, tasks);
      const conversationHistory = messages.slice(-8).map((m) => `${m.role === 'user' ? 'Utente' : 'Focusy'}: ${m.content}`).join('\n');
      const prompt = `${context}\n\nCONVERSAZIONE:\n${conversationHistory}\nUtente: ${text.trim()}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: RESPONSE_SCHEMA,
      });

      const reply = response?.reply || 'Scusa, non sono riuscito a rispondere.';
      const actions = response?.actions || [];

      const results = [];
      for (const action of actions) {
        const result = await executeAction(action);
        results.push(result);
      }

      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      if (results.length) setActionResults(results);
    } catch (e) {
      console.error('ProjectWorkChat error', e);
      setMessages((m) => [...m, { role: 'assistant', content: 'Scusa, c\'è stato un errore. Riprova tra un momento.' }]);
    } finally {
      setLoading(false);
    }
  }, [loading, project, messages, goals, tasks, executeAction]);

  if (!project) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-background/90 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-border bg-card flex flex-col max-h-[85vh] h-[85vh] sm:h-[600px]"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
                  <Briefcase size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold truncate">{project.title}</p>
                  <p className="text-[11px] text-muted-foreground">{t('ptw_tagline')}</p>
                </div>
              </div>
              <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted shrink-0">
                <X size={18} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background">
                    <Sparkles size={28} />
                  </div>
                  <div>
                    <p className="text-sm font-bold mb-1">{t('ptw_welcome_title')}</p>
                    <p className="text-xs text-muted-foreground max-w-[260px]">{t('ptw_welcome_desc')}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2 w-full mt-2">
                    {STARTERS.map((key) => (
                      <button
                        key={key}
                        onClick={() => sendMessage(t(key))}
                        className="text-left rounded-xl border border-border bg-background p-3 text-xs text-foreground hover:bg-accent/30 transition-colors"
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
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
              {actionResults.length > 0 && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <CheckCircle size={14} />
                  </div>
                  <div className="rounded-2xl bg-muted px-3.5 py-2.5 space-y-1">
                    {actionResults.map((r, i) => (
                      <p key={i} className={`text-xs flex items-center gap-1.5 ${r.ok ? 'text-foreground' : 'text-destructive'}`}>
                        {r.ok ? <CheckCircle size={12} /> : <X size={12} />}
                        {r.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                    <Bot size={14} />
                  </div>
                  <div className="rounded-2xl bg-muted px-3.5 py-2.5">
                    <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-border">
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-background px-3 py-1.5">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(input); }}
                  placeholder={t('ptw_input_placeholder')}
                  disabled={loading}
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={loading || !input.trim()}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-foreground text-background disabled:opacity-40"
                >
                  <Send size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
