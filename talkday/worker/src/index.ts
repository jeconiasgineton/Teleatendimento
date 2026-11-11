import { authenticate, nextReset, redeem, generateCode, usageDay } from './auth.ts';
import { handleAccount } from './accountRoutes.ts';
import { UpstreamError, askChat, askCoach, askGemini } from './gemini.ts';
import { FREE_DAILY_LIMIT, type Env } from './types.ts';
import { bump } from './usage.ts';
import { normalizeChat, normalizeCoach, normalizeResult, parseChatRequest, parseCheckRequest, parseCoachRequest } from './validate.ts';

export { AccountDO } from './accountDo.ts';
export { UsageCounter } from './usage.ts';

const ROUTES = new Set(['/check', '/coach', '/chat', '/redeem', '/admin/code', '/account/signup', '/account/login', '/account/refresh', '/account/get', '/account/put']);

/** Tamanho máximo do corpo por rota (o histórico do aluno é a maior). */
function maxBody(pathname: string): number {
  if (pathname === '/account/put' || pathname === '/account/signup') return 140_000;
  return pathname === '/chat' ? 8192 : 4096;
}
/** Tentativas de resgate de código por IP por dia (barra adivinhação do código master). */
const REDEEM_ATTEMPTS_PER_DAY = 20;
const DEVICE_RE = /^[A-Za-z0-9-]{16,64}$/;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export async function handle(request: Request, env: Env, fetchImpl: typeof fetch = fetch, nowMs: number = Date.now()): Promise<Response> {
  const { pathname } = new URL(request.url);

  if (pathname === '/health') return json({ ok: true });
  if (!ROUTES.has(pathname)) return json({ error: 'não encontrado' }, 404);
  if (request.method !== 'POST') return json({ error: 'método não permitido' }, 405);

  const len = Number(request.headers.get('content-length') ?? '0');
  if (len > maxBody(pathname)) return json({ error: 'corpo muito grande' }, 413);

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > maxBody(pathname)) return json({ error: 'corpo muito grande' }, 413);
    body = JSON.parse(text);
  } catch {
    return json({ error: 'json inválido' }, 400);
  }
  const day = usageDay(nowMs);
  const ip = request.headers.get('cf-connecting-ip') ?? '';

  // ---- conta do aluno (e-mail + celular + senha) e histórico na nuvem ----
  if (pathname.startsWith('/account/')) return handleAccount(pathname, body, request, env, nowMs);

  // ---- resgatar código: troca por token assinado ----
  if (pathname === '/redeem') {
    if (!env.AUTH_SECRET) return json({ error: 'unconfigured' }, 503);
    if (ip && (await bump(env, `redeem:${ip}:${day}`)) > REDEEM_ATTEMPTS_PER_DAY) return json({ error: 'too_many_attempts' }, 429);
    const code = (body as { code?: unknown } | null)?.code;
    if (typeof code !== 'string' || code.length > 80) return json({ error: 'código inválido' }, 400);
    const r = await redeem(env, code, nowMs);
    return r ? json(r) : json({ error: 'invalid_code' }, 403);
  }

  const auth = await authenticate(request, env, nowMs);
  if (auth.invalid) return json({ error: 'token_invalid' }, 401);

  // ---- painel master: gera código premium ----
  if (pathname === '/admin/code') {
    if (auth.plan !== 'master' || !env.AUTH_SECRET) return json({ error: 'master_required' }, 403);
    const days = (body as { days?: unknown } | null)?.days;
    if (typeof days !== 'number' || !Number.isInteger(days) || days < 1 || days > 365) return json({ error: 'days inválido' }, 400);
    return json(await generateCode(env.AUTH_SECRET, days, nowMs));
  }

  // ---- conversas com IA: só premium e master ----
  if ((pathname === '/coach' || pathname === '/chat') && auth.plan === 'free') return json({ error: 'premium_required' }, 403);
  if (!env.GEMINI_API_KEY) return json({ error: 'servidor sem chave configurada' }, 500);

  try {
    if (pathname === '/chat') {
      const parsed = parseChatRequest(body);
      if (!parsed.ok) return json({ error: parsed.error }, 400);
      const result = normalizeChat(await askChat(env, parsed.value, fetchImpl));
      return result ? json(result) : json({ error: 'resposta inesperada da IA' }, 502);
    }

    if (pathname === '/coach') {
      const parsed = parseCoachRequest(body);
      if (!parsed.ok) return json({ error: parsed.error }, 400);
      const result = normalizeCoach(await askCoach(env, parsed.value, fetchImpl), parsed.value);
      return result ? json(result) : json({ error: 'resposta inesperada da IA' }, 502);
    }

    const parsed = parseCheckRequest(body);
    if (!parsed.ok) return json({ error: parsed.error }, 400);

    // ---- limite diário do plano free ----
    let usage: { used: number; limit: number } | undefined;
    if (auth.plan === 'free') {
      const device = request.headers.get('x-device-id') ?? '';
      if (!DEVICE_RE.test(device)) return json({ error: 'device_required' }, 400);
      const used = await bump(env, `dev:${device}:${day}`);
      // Trava extra por IP (generosa) contra quem gera ids de aparelho novos o tempo todo.
      const ipUsed = ip ? await bump(env, `ip:${ip}:${day}`) : 0;
      if (used > FREE_DAILY_LIMIT || ipUsed > FREE_DAILY_LIMIT * 6) {
        return json({ error: 'daily_limit', limit: FREE_DAILY_LIMIT, resetsAt: nextReset(nowMs) }, 429);
      }
      if (env.USAGE) usage = { used, limit: FREE_DAILY_LIMIT };
    }

    const result = normalizeResult(await askGemini(env, parsed.value, fetchImpl), parsed.value);
    if (!result) return json({ error: 'resposta inesperada da IA' }, 502);
    return json(usage ? { ...result, usage } : result);
  } catch (e) {
    return json({ error: e instanceof UpstreamError ? 'falha na IA' : 'erro interno' }, 502);
  }
}

export default {
  fetch: (request: Request, env: Env) => handle(request, env),
};
