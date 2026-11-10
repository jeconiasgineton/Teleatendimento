import { RESPONSE_SCHEMA, SYSTEM_PROMPT, buildUserPrompt } from './prompts.ts';
import type { CheckRequest, Env } from './types.ts';

export class UpstreamError extends Error {}

export async function askGemini(env: Env, req: CheckRequest, fetchImpl: typeof fetch = fetch): Promise<unknown> {
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text: buildUserPrompt(req) }] }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
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
