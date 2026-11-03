import { useState } from 'react';
import { BedSingle, Plus, Trash2, ExternalLink, ChevronDown } from 'lucide-react';
import { useT } from '@/lib/i18n';
import { classifyNap, totalNapMinutes, NAP_SOURCES } from '@/lib/sleepData';

const fmt = (min) => (min >= 60 ? `${Math.floor(min / 60)}h ${min % 60}m` : `${min}m`);

// Pisolini di oggi: li aggiungi con inizio e fine (o arrivano da Salute), tolgono minuti al debito
// di sonno e contano nel voto. Per ognuno l'app dice in che fase del sonno ti sei svegliato.
export default function NapsCard({ naps, onChange }) {
  const t = useT();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const [showSources, setShowSources] = useState(false);
  const list = naps || [];
  const total = totalNapMinutes(list);

  const add = () => {
    const nap = { start, end };
    if (!start || !end || classifyNap(nap).minutes <= 0) {
      setError(t('nap_err_time'));
      return;
    }
    setError('');
    onChange([...list, nap].sort((a, b) => a.start.localeCompare(b.start)));
    setStart('');
    setEnd('');
  };

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-1 flex items-center gap-2">
        <BedSingle size={16} strokeWidth={1.8} className="text-purple-400" />
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('nap_title')}</p>
        {total > 0 && <span className="ml-auto text-xs font-semibold tabular-nums text-emerald-500">-{fmt(total)}</span>}
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">{t('nap_sub')}</p>

      {list.length > 0 && (
        <div className="mb-3 space-y-2">
          {list.map((nap, i) => {
            const c = classifyNap(nap);
            return (
              <div key={`${nap.start}-${i}`} className="rounded-xl bg-background/50 p-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold tabular-nums">{nap.start}–{nap.end}</p>
                  <span className="text-xs text-muted-foreground">{fmt(c.minutes)}</span>
                  <span className="ml-auto rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-400">{t(`nap_kind_${c.kind}`)}</span>
                  <button onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label={t('rimuovi')} className="p-1 text-muted-foreground">
                    <Trash2 size={14} />
                  </button>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t(`nap_desc_${c.kind}`)}</p>
                {c.late && <p className="mt-1 text-[11px] leading-snug text-amber-500">{t('nap_late')}</p>}
                {nap.auto && <p className="mt-1 text-[10px] text-muted-foreground">{t('bf_sleep_auto')}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">{t('nap_start')}</p>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="w-full rounded-xl border border-border bg-background px-2 py-2.5 text-sm outline-none [color-scheme:dark]" />
        </div>
        <div>
          <p className="mb-1 text-[11px] text-muted-foreground">{t('nap_end')}</p>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="w-full rounded-xl border border-border bg-background px-2 py-2.5 text-sm outline-none [color-scheme:dark]" />
        </div>
        <button onClick={add} aria-label={t('nap_add')} className="flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-foreground text-background">
          <Plus size={18} />
        </button>
      </div>
      {error && <p className="mt-2 text-[11px] text-amber-500">{error}</p>}

      <p className="mt-3 text-[11px] leading-snug text-muted-foreground">{t('nap_rating_note')} {t('nap_partial')}</p>

      <button onClick={() => setShowSources((v) => !v)} className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        {t('nap_sources')} <ChevronDown size={11} className={showSources ? 'rotate-180' : ''} />
      </button>
      {showSources && (
        <div className="mt-1 space-y-1">
          {NAP_SOURCES.map((s) => (
            <a key={s.url} href={s.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-[10px] text-muted-foreground underline-offset-2 hover:underline">
              <ExternalLink size={10} className="shrink-0" /> {s.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
