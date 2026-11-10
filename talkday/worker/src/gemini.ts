import { COACH_SCHEMA, COACH_SYSTEM_PROMPT, RESPONSE_SCHEMA, SYSTEM_PROMPT, buildCoachPrompt, buildUserPrompt } from './prompts.ts';
import type { CheckRequest, CoachRequest, Env } from './types.ts';

export class UpstreamError extends Error {}

interface Call {
  system: string;
  user: string;
  schema: object;
  temperature: number;
}

async function callGemini(env: Env, call: Call, fetchImpl: typeof fetch): Promise<unknown> {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: call.system }] },
      contents: [{ role: 'user', parts: [{ text: call.user }] }],
      generationConfig: {
        temperature: call.temperature,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        responseSchema: call.schema,
      },
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new UpstreamError(`gemini ${res.status}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('');
  if (!text) throw new UpstreamError('resposta vazia');
  try {
    return JSON.parse(text);
  } catch {
    throw new UpstreamError('json inválido');
  }
}

export function askGemini(env: Env, req: CheckRequest, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  return callGemini(env, { system: SYSTEM_PROMPT, user: buildUserPrompt(req), schema: RESPONSE_SCHEMA, temperature: 0.2 }, fetchImpl);
}

/** Temperatura maior: queremos perguntas variadas a cada conversa. */
export function askCoach(env: Env, req: CoachRequest, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  return callGemini(env, { system: COACH_SYSTEM_PROMPT, user: buildCoachPrompt(req), schema: COACH_SCHEMA, temperature: 0.9 }, fetchImpl);
}
