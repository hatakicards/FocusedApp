import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // Errore ad alta visibilita' in dev/build: senza queste due variabili
  // l'intera app non puo' funzionare (auth + dati passano tutti da qui).
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] VITE_SUPABASE_URL e/o VITE_SUPABASE_ANON_KEY mancanti. ' +
    'Copia .env.example in .env.local e compila i valori dal tuo progetto Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
