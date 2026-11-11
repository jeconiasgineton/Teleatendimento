import { accountKey, emailHint, normalizeEmail, normalizePhone, parseProgressData, passwordProblem, phoneHint } from './account.ts';
import { SESSION_TTL_MS, signSession, usageDay, verifySession } from './auth.ts';
import type { Env, ProgressData } from './types.ts';
import { bump } from './usage.ts';

/** Cadastros e logins por IP por dia (barra tentativa em massa). */
const AUTH_ATTEMPTS_PER_IP_PER_DAY = 100;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

interface AccountReply {
  version: number;
  data: ProgressData | null;
}

/** Rotas /account/*: cadastro, login e sincronização do histórico. */
export async function handleAccount(pathname: string, body: unknown, request: Request, env: Env, nowMs: number): Promise<Response> {
  const secret = env.AUTH_SECRET;
  const accounts = env.ACCOUNTS;
  if (!secret || !accounts) return json({ error: 'unconfigured' }, 503);
  const b = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;

  const call = (key: string, op: string, payload: Record<string, unknown>) =>
    accounts.get(accounts.idFromName(key)).fetch(new Request(`https://account/${op}`, { method: 'POST', body: JSON.stringify({ ...payload, now: nowMs }) }));
  const relay = async (res: Response) => json(await res.json().catch(() => ({ error: 'erro interno' })), res.status);
  const newSession = async (key: string) => {
    const expiresAt = nowMs + SESSION_TTL_MS;
    return { token: await signSession(secret, { a: key, e: Math.floor(expiresAt / 1000) }), expiresAt };
  };

  if (pathname === '/account/signup' || pathname === '/account/login') {
    const ip = request.headers.get('cf-connecting-ip') ?? '';
    if (ip && (await bump(env, `auth:${ip}:${usageDay(nowMs)}`)) > AUTH_ATTEMPTS_PER_IP_PER_DAY) return json({ error: 'too_many_attempts' }, 429);

    const email = normalizeEmail(b.email);
    if (!email) return json({ error: 'invalid_email' }, 400);
    const phone = normalizePhone(b.phone);
    if (!phone) return json({ error: 'invalid_phone' }, 400);
    const password = b.password;
    const signup = pathname === '/account/signup';
    if (signup ? passwordProblem(password, email) : typeof password !== 'string' || password.length > 72) {
      return json({ error: signup ? 'weak_password' : 'invalid_credentials' }, signup ? 400 : 401);
    }

    let data: ProgressData | null = null;
    if (signup && b.data !== undefined && b.data !== null) {
      data = parseProgressData(b.data);
      if (!data) return json({ error: 'invalid_data' }, 400);
    }

    const key = await accountKey(secret, email, phone);
    const res = await call(key, signup ? 'signup' : 'login', { password, data });
    if (!res.ok) return relay(res);
    const reply = (await res.json()) as AccountReply;
    return json({ session: await newSession(key), version: reply.version, data: reply.data, emailHint: emailHint(email), phoneHint: phoneHint(phone) });
  }

  // ---- as demais rotas exigem a sessão (cabeçalho x-session) ----
  const session = await verifySession(secret, request.headers.get('x-session') ?? '', nowMs);
  if (!session) return json({ error: 'session_invalid' }, 401);

  if (pathname === '/account/refresh') {
    const res = await call(session.a, 'get', {});
    if (!res.ok) return json({ error: 'session_invalid' }, 401);
    return json({ session: await newSession(session.a) });
  }
  if (pathname === '/account/get') return relay(await call(session.a, 'get', {}));
  if (pathname === '/account/put') {
    const data = parseProgressData(b.data);
    if (!data) return json({ error: 'invalid_data' }, 400);
    if (typeof b.baseVersion !== 'number' || !Number.isInteger(b.baseVersion) || b.baseVersion < 0) return json({ error: 'invalid_version' }, 400);
    return relay(await call(session.a, 'put', { data, baseVersion: b.baseVersion }));
  }
  return json({ error: 'não encontrado' }, 404);
}
