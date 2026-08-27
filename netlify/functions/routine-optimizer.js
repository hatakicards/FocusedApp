import { supabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { callGroq } from './_shared/groq.js';

// Stesse istruzioni dell'agente originale (base44/agents/routine_optimizer.jsonc),
// stesso accesso in sola lettura a DayEntry + BodyFuelEntry, stessa lingua e
// stile di risposta. Usa Groq (piano gratuito) invece di Anthropic.
const SYSTEM_PROMPT = `Sei un esperto di ottimizzazione della routine integrato nell'app Focused. Hai accesso diretto ai record DayEntry dell'utente (voti giornalieri 1-5, pensieri) e BodyFuelEntry (calorie, macro, ore/qualita' del sonno, peso). Quando richiesto, rivedi questi dati e fornisci suggerimenti di ottimizzazione della routine specifici e pratici. Rispondi sempre in italiano. Sii conciso (4-6 righe), pratico e basato sui dati. Cita punti specifici dai dati dell'utente (es. 'Hai dormito 5 ore il martedi e il tuo voto e stato 2/5'). Identifica pattern (es. voti bassi in certi giorni, deficit calorici, sonno scarso correlato a voti bassi) e suggerisci miglioramenti concreti alla routine quotidiana. Se i dati sono insufficienti, dillo e suggerisci cosa iniziare a tracciare.`;

export default async (req) => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const [dayEntriesRes, bodyFuelRes] = await Promise.all([
      supabaseAdmin
        .from('day_entry')
        .select('date, day_rating, thoughts')
        .eq('created_by_id', user.id)
        .order('date', { ascending: false })
        .limit(30),
      supabaseAdmin
        .from('body_fuel_entry')
        .select(
          'date, calories_consumed, calories_goal, protein_consumed, carbs_consumed, lipids_consumed, sleep_hours, sleep_minutes, sleep_quality, weight'
        )
        .eq('created_by_id', user.id)
        .order('date', { ascending: false })
        .limit(30),
    ]);
    if (dayEntriesRes.error) throw dayEntriesRes.error;
    if (bodyFuelRes.error) throw bodyFuelRes.error;

    const dataSummary =
      `DayEntry (dal piu recente):\n${JSON.stringify(dayEntriesRes.data || [])}\n\n` +
      `BodyFuelEntry (dal piu recente):\n${JSON.stringify(bodyFuelRes.data || [])}`;

    const body = await req.json().catch(() => ({}));
    const userMessage =
      body.message ||
      'Analizza i miei DayEntry e BodyFuelEntry e dammi suggerimenti personalizzati per ottimizzare la mia routine quotidiana.';

    const result = await callGroq({
      prompt: `${dataSummary}\n\nRichiesta dell'utente: ${userMessage}`,
      systemPrompt: SYSTEM_PROMPT,
      maxOutputTokens: 500,
    });

    if (!result.ok) {
      if (result.status === 500) return jsonResponse({ error: result.errText }, 500);
      console.error('routine-optimizer: Groq API error', result.status, result.errText);
      return jsonResponse({ error: 'LLM request failed' }, 502);
    }

    return jsonResponse({
      reply: result.text || 'Non sono riuscito ad analizzare i dati in questo momento. Riprova tra poco.',
    });
  } catch (error) {
    console.error('routine-optimizer error', error);
    return jsonResponse({ error: error.message }, 500);
  }
};
