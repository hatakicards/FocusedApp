// Client per Groq (piano gratuito, nessuna carta richiesta) — API compatibile
// OpenAI. Usato sia da invoke-llm.js (Focusy, inferenza stile di vita,
// project planner) sia da routine-optimizer.js.
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// I modelli gpt-oss su Groq occasionalmente falliscono la tool_call forzata
// (nome vuoto, o nessuna tool_call generata affatto) sotto reasoning_effort
// basso. Un secondo tentativo con reasoning_effort piu' alto risolve la
// stragrande maggioranza di questi casi (visto in produzione con Focusy).
const REASONING_ATTEMPTS_WITH_SCHEMA = ['low', 'medium'];

// Il piano gratuito Groq per questo modello ha un limite di soli 8000 token
// al minuto (per l'intero account, non per richiesta) — sotto carico si
// esaurisce in pochi messaggi consecutivi. La finestra si libera in fretta
// (visto in pratica sotto il secondo), quindi una breve attesa prima di un
// singolo retry basta quasi sempre, senza sprecare altro budget riprovando
// con reasoning_effort piu' alto (che consumerebbe ancora piu' token proprio
// mentre siamo gia' al limite).
const RATE_LIMIT_RETRY_WAIT_MS = 1500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGroqOnce({ apiKey, messages, responseJsonSchema, maxOutputTokens, reasoningEffort }) {
  const payload = { model: GROQ_MODEL, max_tokens: maxOutputTokens, reasoning_effort: reasoningEffort, messages };

  if (responseJsonSchema) {
    payload.tools = [
      {
        type: 'function',
        function: {
          name: 'structured_response',
          description: 'Restituisce la risposta nel formato richiesto',
          parameters: responseJsonSchema,
        },
      },
    ];
    payload.tool_choice = { type: 'function', function: { name: 'structured_response' } };
  }

  const res = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    // Il tool_call rifiutato (es. "name" vuoto) include comunque il contenuto
    // generato (valido) in error.failed_generation — lo recuperiamo invece di
    // considerare il tentativo fallito.
    if (responseJsonSchema) {
      try {
        const errData = JSON.parse(errText);
        const failedGen = errData?.error?.failed_generation;
        if (failedGen) {
          const parsedGen = typeof failedGen === 'string' ? JSON.parse(failedGen) : failedGen;
          const args = parsedGen?.arguments;
          if (args) {
            return { ok: true, text: typeof args === 'string' ? args : JSON.stringify(args) };
          }
        }
      } catch {
        // fall through, tentativo fallito
      }
    }
    return { ok: false, status: res.status, errText };
  }

  const data = await res.json();
  const message = data.choices?.[0]?.message;

  if (responseJsonSchema) {
    const toolCall = message?.tool_calls?.[0];
    if (!toolCall) return { ok: false, status: 502, errText: 'Groq did not return a tool call' };
    return { ok: true, text: toolCall.function.arguments };
  }

  return { ok: true, text: message?.content || '' };
}

// Chiamata a Groq con un singolo messaggio utente (+ system prompt opzionale).
// Se responseJsonSchema e' presente, forza l'output strutturato tramite
// function-calling (stesso schema JSON usato lato frontend, nessuna
// conversione necessaria — a differenza di Gemini, Groq/OpenAI vogliono i
// "type" in minuscolo, gia' cosi' negli schema esistenti).
// Ritorna { ok:true, text } oppure { ok:false, status, errText }.
// Il piano gratuito Groq riserva contro il budget TPM la somma di prompt +
// max_tokens richiesti, non i token effettivamente generati — abbiamo
// misurato risposte reali di Focusy sempre sotto i 300 token di completion,
// quindi un default piu' basso di 2048 lascia lo stesso margine ma libera
// molto piu' budget per messaggio (visto in produzione: richieste da ~3900
// token su un tetto di 8000/minuto, sufficienti per solo 2 messaggi).
export async function callGroq({ prompt, systemPrompt, responseJsonSchema, maxOutputTokens = 900 }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return { ok: false, status: 500, errText: 'GROQ_API_KEY non configurata su Netlify' };

  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });

  const attempts = responseJsonSchema ? REASONING_ATTEMPTS_WITH_SCHEMA : ['low'];

  let result;
  for (const reasoningEffort of attempts) {
    result = await callGroqOnce({ apiKey, messages, responseJsonSchema, maxOutputTokens, reasoningEffort });
    if (result.ok) return result;

    if (result.status === 429) {
      await sleep(RATE_LIMIT_RETRY_WAIT_MS);
      const retryResult = await callGroqOnce({ apiKey, messages, responseJsonSchema, maxOutputTokens, reasoningEffort });
      return retryResult.ok
        ? retryResult
        : { ok: false, status: 429, errText: 'Troppe richieste in questo momento, riprova tra qualche secondo.' };
    }
  }
  return result;
}
