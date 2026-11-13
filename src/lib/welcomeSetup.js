// Risposte alle domande del benvenuto -> impostazioni vere dell'app.
// setup: { profile: 'studente'|'professionista'|'atleta'|'base', gym: '0'|'1-2'|'3-4'|'5+',
//          block: 'phone'|'time'|'consistency'|'motivation' }
// current: le impostazioni gia' salvate (per non sovrascrivere scelte fatte prima).
const PROFILE_TEXT = { studente: 'studiare', professionista: 'lavorare', atleta: 'fare sport e allenarsi', base: 'un mix di studio, lavoro e sport' };
const BLOCK_TEXT = { phone: 'il telefono e le distrazioni', time: 'organizzare il tempo', consistency: 'essere costante', motivation: 'trovare la motivazione' };

export function setupToSettings(setup, current = {}) {
  if (!setup) return {};
  const patch = {};
  if (setup.profile && (!current.profile_type || current.profile_type === 'base')) patch.profile_type = setup.profile;
  if (setup.gym && setup.gym !== '0') patch.gym_enabled = true;

  // Focusy le legge nella sua memoria (in italiano, come il resto del suo prompt).
  const notes = [];
  if (setup.profile) notes.push(`Dal benvenuto: passa le giornate soprattutto a ${PROFILE_TEXT[setup.profile]}.`);
  if (setup.gym) notes.push(setup.gym === '0' ? 'Dal benvenuto: per ora non si allena.' : `Dal benvenuto: si allena ${setup.gym} volte a settimana.`);
  if (setup.block) notes.push(`Dal benvenuto: la difficolta' principale e' ${BLOCK_TEXT[setup.block]}.`);
  if (notes.length) {
    const prev = (current.focusy_memory || '').trim();
    patch.focusy_memory = prev ? `${prev}\n${notes.join('\n')}` : notes.join('\n');
  }
  return patch;
}
