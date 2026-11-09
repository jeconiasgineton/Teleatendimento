import { UpstreamError, askGemini } from './gemini.ts';
import type { Env } from './types.ts';
import { normalizeResult, parseCheckRequest } from './validate.ts';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** Comparação em tempo (quase) constante para o token do app. */
function sameToken(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function handle(request: Request, env: Env, fetchImpl: typeof fetch = fetch): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === '/health') return json({ ok: true });
  if (pathname !== '/check') return json({ error: 'não encontrado' }, 404);
  if (request.method !== 'POST') return json({ error: 'método não permitido' }, 405);

  if (env.APP_TOKEN && !sameToken(request.headers.get('x-app-token') ?? '', env.APP_TOKEN)) {
    return json({ error: 'não autorizado' }, 401);
  }
  if (!env.GEMINI_API_KEY) return json({ error: 'servidor sem chave configurada' }, 500);

  const len = Number(request.headers.get('content-length') ?? '0');
  if (len > 4096) return json({ error: 'corpo muito grande' }, 413);

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json({ error: 'json inválido' }, 400);
  }
  const parsed = parseCheckRequest(body);
  if (!parsed.ok) return json({ error: parsed.error }, 400);

  try {
    const raw = await askGemini(env, parsed.value, fetchImpl);
    const result = normalizeResult(raw, parsed.value);
    if (!result) return json({ error: 'resposta inesperada da IA' }, 502);
    return json(result);
  } catch (e) {
    return json({ error: e instanceof UpstreamError ? 'falha na IA' : 'erro interno' }, 502);
  }
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
};
