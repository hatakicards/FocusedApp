import { getSupabaseAdmin, getUserFromRequest, jsonResponse } from './_shared/supabaseAdmin.js';
import { callGroq } from './_shared/groq.js';

// Sostituisce base44.integrations.Core.InvokeLLM. Usa Groq (piano gratuito)
// invece di Anthropic — stesso contratto verso il frontend:
// {prompt, response_json_schema?} -> {reply} oppure l'oggetto strutturato
// conforme allo schema. Nessuna modifica necessaria a FocusyAssistant.jsx,
// CalorieCalculator.jsx o ProjectPlanner.jsx.
export async function onRequestPost({ request, env }) {
  try {
    const supabaseAdmin = getSupabaseAdmin(env);
    const user = await getUserFromRequest(request, supabaseAdmin);
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const { prompt, response_json_schema } = await request.json();
    if (!prompt) return jsonResponse({ error: 'missing prompt' }, 400);

    const result = await callGroq({ env, prompt, responseJsonSchema: response_json_schema });

    if (!result.ok) {
      if (result.status === 500) return jsonResponse({ error: result.errText }, 500);
      console.error('invoke-llm: Groq API error', result.status, result.errText);
      return jsonResponse({ error: 'LLM request failed' }, 502);
    }

    if (response_json_schema) {
      try {
        return jsonResponse(JSON.parse(result.text));
      } catch (e) {
        console.error('invoke-llm: failed to parse Groq JSON output', result.text);
        return jsonResponse({ error: 'LLM did not return structured output' }, 502);
      }
    }

    return jsonResponse({ reply: result.text });
  } catch (error) {
    console.error('invoke-llm error', error);
    return jsonResponse({ error: error.message }, 500);
  }
}
