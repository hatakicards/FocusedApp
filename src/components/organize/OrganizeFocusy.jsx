import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Sparkles, X, Send, Check, Brain, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { getDB } from '@/lib/guestDB';
import { useAuth } from '@/lib/AuthContext';
import { useT } from '@/lib/i18n';
import { useTasks, useUserSettings, useHomeworks, useVerifiche, useGoals, useDayEntries } from '@/lib/useAppData';
import { useCalendarEvents, dateKey } from '@/lib/calendarEvents';

const SCHEMA = {
  type: 'object',
  properties: {
    reply: { type: 'string', description: "Risposta breve all'utente, nella stessa lingua del suo ultimo messaggio" },
    questions: { type: 'array', items: { type: 'string' }, description: 'Domande di chiarimento brevi (massimo 3); vuoto se hai gia abbastanza informazioni' },
    proposals: {
      type: 'array',
      description: "Elementi da mettere in calendario con orari concreti; vuoto se stai ancora facendo domande",
      items: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: "id esatto della cosa da fare esistente, o stringa vuota se e' nuova" },
          title: { type: 'string' },
          date: { type: 'string', description: 'YYYY-MM-DD' },
          start: { type: 'string', description: 'HH:MM' },
          end: { type: 'string', description: 'HH:MM' },
          reason: { type: 'string', description: 'Perche proprio qui, in una frase' },
        },
        required: ['title', 'date', 'start', 'end'],
      },
    },
    memory_notes: { type: 'array', items: { type: 'string' }, description: "Fatti stabili sull'utente emersi ora (preferenze di orario, vincoli, abitudini), massimo 3 frasi brevi" },
  },
  required: ['reply'],
};

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function mergeMemory(current, notes) {
  const lines = String(current || '').split('\n').map((l) => l.trim()).filter(Boolean);
  for (const n of notes || []) {
    const note = String(n).trim().replace(/\s+/g, ' ');
    if (note.length < 4) continue;
    if (lines.some((l) => l.toLowerCase() === note.toLowerCase())) continue;
    lines.push(note);
  }
  let out = lines.slice(-20).join('\n');
  if (out.length > 1500) out = out.slice(out.length - 1500);
  return out;
}

// Focusy legge tutto quello che c'e' da fare, l'orario, le scadenze e l'andamento recente,
// propone dove mettere ogni cosa nella giornata (o nella settimana), fa domande quando
// manca qualcosa e si ricorda quello che gli dici per le volte dopo.
export default function OrganizeFocusy({ open, onClose }) {
  const t = useT();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { data: tasks } = useTasks();
  const { data: settings } = useUserSettings();
  const { data: homeworks } = useHomeworks();
  const { data: verifiche } = useVerifiche();
  const { data: goals } = useGoals();
  const { data: dayEntries } = useDayEntries();
  const getEvents = useCalendarEvents();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState({});
  const endRef = useRef(null);

  useEffect(() => {
    if (open) { setMessages([]); setInput(''); setApplied({}); }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, loading]);

  const buildContext = () => {
    const now = new Date();
    const days = Array.from({ length: 8 }, (_, i) => { const d = new Date(now); d.setDate(d.getDate() + i); return d; });
    const fixed = days.map((d) => {
      const { timed, allDay } = getEvents(d);
      const lines = [...timed.map((e) => `${e.start}-${e.end || '?'} ${e.title} (${e.kind})`), ...allDay.map((e) => `tutto il giorno: ${e.title} (${e.kind})`)];
      return `${dateKey(d)}: ${lines.length ? lines.join('; ') : 'libero'}`;
    }).join('\n');

    const openTasks = (tasks || []).filter((x) => x.status === 'active')
      .map((x) => `- id=${x.id} | ${x.title} | tipo ${x.type}${x.due_date ? ` | per il ${x.due_date}` : ''}${x.due_time ? ` ${x.due_time}` : ''}${x.expiry_date ? ` | scade ${x.expiry_date}` : ''}`).join('\n') || 'nessuna';
    const hw = (homeworks || []).filter((h) => h.status !== 'done' && !h.completed)
      .map((h) => `- ${h.subject}: ${h.title}${h.due_date ? ` (per il ${h.due_date})` : ''}`).join('\n') || 'nessuno';
    const tests = (verifiche || []).filter((v) => v.status === 'scheduled')
      .map((v) => `- ${v.subject} il ${v.date}${v.topic ? ` (${v.topic})` : ''}`).join('\n') || 'nessuna';
    const goalLines = (goals || []).slice(0, 12).map((g) => `- ${g.title} (${g.timeframe})`).join('\n') || 'nessuno';
    const recent = (dayEntries || []).filter((e) => e.day_rating).slice(0, 7);
    const avg = recent.length ? (recent.reduce((s, e) => s + e.day_rating, 0) / recent.length).toFixed(1) : null;

    return [
      `ADESSO: ${now.toLocaleString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })} (data ${dateKey(now)})`,
      settings?.dream ? `SOGNO DELL'UTENTE: "${settings.dream}"` : '',
      `ANDAMENTO: ${avg ? `media giornate ultimi ${recent.length} giorni ${avg}/5` : 'nessun dato recente'}`,
      `IMPEGNI GIA' FISSATI (prossimi 8 giorni, da non sovrapporre):\n${fixed}`,
      `COSE DA FARE APERTE:\n${openTasks}`,
      `COMPITI:\n${hw}`,
      `VERIFICHE:\n${tests}`,
      `OBIETTIVI:\n${goalLines}`,
      `COSA RICORDI DELL'UTENTE:\n${settings?.focusy_memory || 'niente ancora'}`,
    ].filter(Boolean).join('\n\n');
  };

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || loading) return;
    const next = [...messages, { role: 'user', content: msg }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const history = next.slice(-10).map((m) => `${m.role === 'user' ? 'Utente' : 'Focusy'}: ${m.content}`).join('\n');
      const prompt = `Sei Focusy, l'assistente di Focused. Rispondi SEMPRE nella stessa lingua dell'ultimo messaggio dell'utente (ignora la lingua di queste istruzioni).
Il tuo compito adesso e' ORGANIZZARE il tempo dell'utente nel calendario.

REGOLE:
- Non sovrapporre gli impegni gia' fissati e rispetta lezioni, lavoro e sonno: orari tra le 7:00 e le 23:00 salvo richiesta diversa.
- Priorita': scadenze e verifiche vicine, compiti pesanti, poi il resto. Se l'andamento recente e' basso (media sotto 3) pianifica meno cose e inserisci pause.
- Se per decidere bene ti manca qualcosa (quanto durano le cose, quando rende di piu', cosa conta di piu'), FAI al massimo 3 domande brevi nel campo questions e lascia proposals vuoto. Non fare domande se la risposta e' gia' nel contesto o nella memoria.
- Quando hai abbastanza informazioni compila proposals con orari concreti (start/end HH:MM, date YYYY-MM-DD) e spiega in 2-3 righe nel reply. Per cose gia' esistenti usa il task_id esatto dall'elenco; per cose nuove task_id vuoto.
- memory_notes: fatti stabili sull'utente emersi dalla conversazione (preferenze, vincoli, abitudini), massimo 3 frasi brevi. Non ripetere quello che gia' ricordi.

${buildContext()}

CONVERSAZIONE:
${history}`;
      const res = await base44.integrations.Core.InvokeLLM({ prompt, model: 'gpt_5_4', response_json_schema: SCHEMA, max_output_tokens: 2200 });

      const proposals = (res?.proposals || []).filter((p) => p?.title && DATE_RE.test(p.date || '') && TIME_RE.test(p.start || '') && TIME_RE.test(p.end || ''));
      const notes = (res?.memory_notes || []).filter(Boolean);
      setMessages((m) => [...m, { role: 'assistant', content: res?.reply || '', questions: res?.questions || [], proposals, notes }]);

      if (notes.length && settings?.id) {
        const merged = mergeMemory(settings.focusy_memory, notes);
        if (merged !== (settings.focusy_memory || '')) {
          getDB().UserSettings.update(settings.id, { focusy_memory: merged })
            .then(() => qc.invalidateQueries({ queryKey: ['userSettings'] }))
            .catch(console.error);
        }
      }
    } catch (e) {
      console.error('Organize Focusy error', e);
      setMessages((m) => [...m, { role: 'assistant', content: t('org_err'), questions: [], proposals: [], notes: [] }]);
    } finally {
      setLoading(false);
    }
  };

  const apply = async (idx) => {
    const proposals = messages[idx]?.proposals || [];
    setApplied((a) => ({ ...a, [idx]: 'busy' }));
    try {
      for (const p of proposals) {
        const existing = p.task_id && (tasks || []).find((x) => x.id === p.task_id);
        const patch = { due_date: p.date, due_time: p.start, end_time: p.end };
        if (existing) await getDB().TaskItem.update(existing.id, patch);
        else await getDB().TaskItem.create({ title: p.title, type: 'todo', status: 'active', notes: p.reason || undefined, ...patch });
      }
      qc.invalidateQueries({ queryKey: ['tasks'] });
      setApplied((a) => ({ ...a, [idx]: 'done' }));
    } catch (e) {
      console.error(e);
      setApplied((a) => ({ ...a, [idx]: undefined }));
    }
  };

  if (!open) return null;

  const scopes = [
    { key: 'org_scope_today', msg: 'org_scope_msg_today' },
    { key: 'org_scope_tomorrow', msg: 'org_scope_msg_tomorrow' },
    { key: 'org_scope_week', msg: 'org_scope_msg_week' },
  ];

  return createPortal(
    <div className="pointer-events-auto fixed inset-0 z-[85] flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 pb-3 safe-top">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground text-background"><Sparkles size={16} /></span>
          <h2 className="text-base font-semibold">{t('org_focusy_btn')}</h2>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground"><X size={20} /></button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {user?.isGuest ? (
          <p className="rounded-2xl border border-border bg-card p-4 text-sm text-muted-foreground">{t('org_login')}</p>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-sm">{t('org_focusy_intro')}</p>
                <div className="flex flex-wrap gap-2">
                  {scopes.map((s) => (
                    <button key={s.key} onClick={() => send(t(s.msg))} className="rounded-xl border border-border px-3.5 py-2 text-xs font-semibold">
                      {t(s.key)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'flex justify-end' : ''}>
                {m.role === 'user' ? (
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-foreground px-4 py-2.5 text-sm text-background">{m.content}</p>
                ) : (
                  <div className="max-w-[92%] space-y-2.5">
                    {m.content && <p className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm leading-relaxed">{m.content}</p>}
                    {m.questions?.length > 0 && (
                      <ul className="space-y-1.5">
                        {m.questions.map((q, k) => (
                          <li key={k}>
                            <button onClick={() => setInput((cur) => (cur ? `${cur}\n` : '') + `${q} `)} className="w-full rounded-xl border border-dashed border-border px-3 py-2 text-left text-xs text-muted-foreground">
                              {q}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {m.proposals?.length > 0 && (
                      <div className="rounded-2xl border border-border bg-card p-3">
                        <div className="space-y-2">
                          {m.proposals.map((p, k) => (
                            <div key={k} className="rounded-xl bg-foreground/5 px-3 py-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-sm font-medium">{p.title}</span>
                                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">{p.date.slice(5)} {p.start}–{p.end}</span>
                              </div>
                              {p.reason && <p className="mt-0.5 text-[11px] text-muted-foreground">{p.reason}</p>}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => apply(i)}
                          disabled={!!applied[i]}
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-2.5 text-sm font-semibold text-background disabled:opacity-60"
                        >
                          {applied[i] === 'done' ? <><Check size={15} /> {t('org_applied')}</> : applied[i] === 'busy' ? <Loader2 size={15} className="animate-spin" /> : t('org_apply')}
                        </button>
                      </div>
                    )}
                    {m.notes?.length > 0 && (
                      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Brain size={12} /> {t('org_remembered')}</p>
                    )}
                  </div>
                )}
              </div>
            ))}

            {loading && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {t('org_thinking')}</p>}
            <div ref={endRef} />
          </>
        )}
      </div>

      {!user?.isGuest && (
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex items-end gap-2 border-t border-border px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={1}
            placeholder={t('org_focusy_ph')}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-border bg-card px-4 py-3 text-sm outline-none"
          />
          <button type="submit" disabled={!input.trim() || loading} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background disabled:opacity-40">
            <Send size={16} />
          </button>
        </form>
      )}
    </div>,
    document.body
  );
}
