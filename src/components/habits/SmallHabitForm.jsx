import { useEffect, useMemo, useState } from 'react';
import { Clock, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle,
  AlertDialogDescription, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n, weekdayShort } from '@/lib/i18n';
import { useOptimisticSmallHabitDelete, useOptimisticSmallHabitSave, useSmallHabits } from '@/lib/useAppData';
import { normalizeTime, quickTimeGuess, sortTimes } from '@/lib/smallHabits';

// Lunedi' ... domenica come valori di Date.getDay() (0 = domenica).
const MON_FIRST = [1, 2, 3, 4, 5, 6, 0];
const LANG_NAMES = { it: 'italiano', en: 'English', es: 'español', fr: 'français', de: 'Deutsch' };

const SCHEMA = {
  type: 'object',
  properties: {
    times: { type: 'array', items: { type: 'string' } },
    days: { type: 'array', items: { type: 'integer' } },
    reason: { type: 'string' },
  },
  required: ['times', 'reason'],
};

// Focusy propone quando fare l'abitudine; l'utente conferma (spec 1.5, punto 5).
async function askFocusy({ name, activityName, others, lang }) {
  const otherLines = others.length
    ? others.map((h) => `- ${h.name}: ${(h.times || []).join(', ') || 'senza orario'}`).join('\n')
    : '(nessuna)';
  const prompt = `Sei Focusy, l'assistente dell'app Focused. L'utente sta creando una "Small Habit", una piccola abitudine dentro l'attivita' "${activityName}".
Abitudine: "${name}"

Le sue altre Small Habits (evita di sovrapporle se non ha senso):
${otherLines}

Proponi a che ora farla durante la giornata, in formato 24h "HH:MM". Capisci il senso dell'abitudine:
- se e' legata a un momento preciso (es. "skincare mattutina" -> mattina), dai UN orario;
- se di solito si fa piu' volte al giorno (es. "skincare", "lavare i denti") dai piu' orari (es. mattina e sera);
- se dipende da un'altra attivita' (es. "cardio a fine allenamento"), proponi l'orario tipico di quell'attivita' + la sua durata.
In "days" metti i giorni solo se l'abitudine non e' quotidiana (0 = domenica ... 6 = sabato), altrimenti lista vuota.
In "reason" spiega in UNA frase breve, in ${LANG_NAMES[lang] || 'English'}, perche' quell'orario. Niente emoji.`;
  const res = await base44.integrations.Core.InvokeLLM({ prompt, response_json_schema: SCHEMA, max_output_tokens: 300 });
  const times = sortTimes(res?.times).slice(0, 6);
  const days = Array.isArray(res?.days) ? [...new Set(res.days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))] : [];
  if (!times.length) throw new Error('no times');
  return { times, days, reason: String(res?.reason || '').slice(0, 220) };
}

export default function SmallHabitForm({ open, onClose, activity, habit }) {
  const { t, lang, locale } = useI18n();
  const { user } = useAuth();
  const { data: allHabits } = useSmallHabits();
  const save = useOptimisticSmallHabitSave();
  const remove = useOptimisticSmallHabitDelete();

  const [name, setName] = useState('');
  const [days, setDays] = useState([]);
  const [times, setTimes] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [asking, setAsking] = useState(false);
  const [askError, setAskError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const dayLabels = useMemo(() => weekdayShort(locale), [locale]);

  useEffect(() => {
    if (!open) return;
    setName(habit?.name || '');
    setDays(Array.isArray(habit?.repeat_days) ? habit.repeat_days : []);
    setTimes(habit?.times || []);
    setProposal(null);
    setAskError(false);
    setAsking(false);
  }, [open, habit]);

  // Proposta immediata dalle parole del nome, finche' l'utente non ha scelto orari suoi.
  useEffect(() => {
    if (!open || habit || times.length) return;
    const guess = quickTimeGuess(name);
    setProposal((cur) => {
      if (cur?.fromAI) return cur;
      return guess ? { times: guess, days: [], reason: '', fromAI: false } : null;
    });
  }, [name, open, habit, times.length]);

  const others = (allHabits || []).filter((h) => h.id !== habit?.id && !h.archived);
  const canAskAI = !!user && !user.isGuest;

  const handleAsk = async () => {
    if (!name.trim() || asking) return;
    setAsking(true);
    setAskError(false);
    try {
      const p = await askFocusy({ name: name.trim(), activityName: activity?.name || '', others, lang });
      setProposal({ ...p, fromAI: true });
    } catch (e) {
      console.error('Focusy small habit time', e);
      setAskError(true);
    } finally {
      setAsking(false);
    }
  };

  const applyProposal = () => {
    if (!proposal) return;
    setTimes(proposal.times);
    if (proposal.days?.length) setDays(proposal.days);
    setProposal(null);
  };

  const toggleDay = (d) => {
    setDays((cur) => {
      const base = cur.length ? cur : [0, 1, 2, 3, 4, 5, 6];
      const next = base.includes(d) ? base.filter((x) => x !== d) : [...base, d];
      // Tutti o nessuno = ogni giorno.
      return next.length === 7 || next.length === 0 ? [] : next.sort();
    });
  };

  const setTimeAt = (i, v) => setTimes((cur) => cur.map((x, j) => (j === i ? v : x)));
  const addTime = () => setTimes((cur) => (cur.length >= 6 ? cur : [...cur, cur.length ? '21:00' : '08:00']));
  const removeTime = (i) => setTimes((cur) => cur.filter((_, j) => j !== i));

  const handleSave = () => {
    const clean = name.trim();
    if (!clean || !activity?.id) return;
    const payload = {
      activity_id: activity.id,
      name: clean.slice(0, 120),
      repeat_days: days.length ? days : null,
      times: sortTimes(times.map(normalizeTime)),
    };
    if (!habit) payload.sort_order = others.filter((h) => h.activity_id === activity.id).length;
    onClose();
    save(habit || null, payload).catch(console.error);
  };

  const handleDelete = () => {
    setConfirmDelete(false);
    onClose();
    if (habit) remove(habit.id).catch(console.error);
  };

  const everyDay = days.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{habit ? t('sh_edit') : t('sh_new')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            <div className="space-y-2">
              <Label htmlFor="sh-name">{t('sh_name')}</Label>
              <Input
                id="sh-name"
                value={name}
                maxLength={120}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('sh_name_ph')}
                autoFocus={!habit}
              />
            </div>

            <div className="space-y-2">
              <Label>{t('sh_days')}</Label>
              <div className="flex gap-1.5">
                {MON_FIRST.map((d, i) => {
                  const on = everyDay || days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={on}
                      className={`h-9 flex-1 rounded-xl border text-[11px] font-semibold capitalize transition-colors ${on ? 'border-foreground bg-foreground text-background' : 'border-border text-muted-foreground'}`}
                    >
                      {dayLabels[i].replace('.', '').slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              {everyDay && <p className="text-xs text-muted-foreground">{t('sh_every_day')}</p>}
            </div>

            <div className="space-y-2">
              <Label>{t('sh_times')}</Label>
              {times.length === 0 && <p className="text-xs text-muted-foreground">{t('sh_anytime')}</p>}
              <div className="flex flex-wrap gap-2">
                {times.map((tm, i) => (
                  <div key={i} className="flex items-center gap-1 rounded-xl border border-border pl-2.5">
                    <Clock size={14} className="text-muted-foreground" />
                    <input
                      type="time"
                      value={tm}
                      onChange={(e) => setTimeAt(i, e.target.value)}
                      className="w-[84px] bg-transparent py-2 text-sm tabular-nums outline-none"
                      aria-label={t('sh_add_time')}
                    />
                    <button type="button" onClick={() => removeTime(i)} className="p-2 text-muted-foreground" aria-label="remove">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {times.length < 6 && (
                  <button type="button" onClick={addTime} className="flex items-center gap-1 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
                    <Plus size={14} /> {t('sh_add_time')}
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-3">
              {proposal ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <Sparkles size={14} /> {t('sh_focusy_proposal')}
                  </div>
                  <p className="text-sm font-semibold tabular-nums">
                    {proposal.times.join(' · ')}
                    {proposal.days?.length ? ` · ${MON_FIRST.filter((d) => proposal.days.includes(d)).map((d) => dayLabels[MON_FIRST.indexOf(d)].replace('.', '').slice(0, 3)).join(' ')}` : ''}
                  </p>
                  {proposal.reason && <p className="text-xs leading-relaxed text-muted-foreground">{proposal.reason}</p>}
                  <Button size="sm" className="w-full" onClick={applyProposal}>{t('sh_focusy_use')}</Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleAsk}
                  disabled={!canAskAI || !name.trim() || asking}
                  className="flex w-full items-center justify-center gap-2 py-1 text-sm font-medium disabled:opacity-40"
                >
                  <Sparkles size={15} /> {asking ? t('sh_focusy_thinking') : t('sh_focusy_ask')}
                </button>
              )}
              {proposal && !proposal.fromAI && canAskAI && (
                <button type="button" onClick={handleAsk} disabled={asking} className="mt-2 w-full text-center text-xs text-muted-foreground disabled:opacity-40">
                  {asking ? t('sh_focusy_thinking') : t('sh_focusy_ask')}
                </button>
              )}
              {askError && <p className="mt-2 text-center text-xs text-muted-foreground">{t('sh_focusy_error')}</p>}
            </div>
          </div>

          <DialogFooter className="flex-row items-center gap-2 sm:justify-between">
            {habit ? (
              <button type="button" onClick={() => setConfirmDelete(true)} className="mr-auto rounded-lg p-2 text-muted-foreground hover:text-destructive" aria-label={t('elimina')}>
                <Trash2 size={18} />
              </button>
            ) : <span className="mr-auto" />}
            <Button variant="ghost" onClick={onClose}>{t('annulla')}</Button>
            <Button onClick={handleSave} disabled={!name.trim()}>{t('salva')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sh_delete_title').replace('{name}', habit?.name || '')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sh_delete_desc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('annulla')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('elimina')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
