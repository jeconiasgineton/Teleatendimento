import type { Env, Plan } from './types.ts';

const enc = new TextEncoder();
const DAY_MS = 86_400_000;
/** Validade máxima de um token; o app renova sozinho (e assim pega revogações). */
export const TOKEN_TTL_MS = 30 * DAY_MS;
// Brasil sem horário de verão: UTC-3 fixo para "dia" e validade de códigos.
const BR_OFFSET_MS = 3 * 3600_000;

export interface TokenPayload {
  p: 'premium' | 'master';
  /** Expira em (segundos desde 1970). */
  e: number;
  /** Id do código que originou o token. */
  c: string;
}

function toB64u(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64u(s: string): Uint8Array | null {
  try {
    const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(b, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string, usage: ('sign' | 'verify')[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

async function hmac(secret: string, data: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret, ['sign']), enc.encode(data)));
}

export async function signToken(secret: string, payload: TokenPayload): Promise<string> {
  const body = toB64u(enc.encode(JSON.stringify(payload)));
  return `v1.${body}.${toB64u(await hmac(secret, `v1.${body}`))}`;
}

/** Devolve o conteúdo se a assinatura for válida e o token não tiver expirado. */
export async function verifyToken(secret: string, token: string, nowMs: number): Promise<TokenPayload | null> {
  const parts = token.split('.');
  if (parts.length !== 3 || parts[0] !== 'v1') return null;
  const sig = fromB64u(parts[2]);
  const bodyBytes = fromB64u(parts[1]);
  if (!sig || !bodyBytes) return null;
  const ok = await crypto.subtle.verify('HMAC', await hmacKey(secret, ['verify']), sig, enc.encode(`v1.${parts[1]}`));
  if (!ok) return null;
  try {
    const p = JSON.parse(new TextDecoder().decode(bodyBytes)) as TokenPayload;
    if ((p.p !== 'premium' && p.p !== 'master') || typeof p.e !== 'number' || typeof p.c !== 'string') return null;
    return p.e * 1000 > nowMs ? p : null;
  } catch {
    return null;
  }
}

// ---- códigos premium (sem banco de dados: a assinatura prova que o código é nosso) ----

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sem O, I, 0, 1
const CODE_RE = /^TD-([A-Z2-9]{6})-(\d{8})-([A-F0-9]{10})$/;

function brDate(ms: number): string {
  return new Date(ms - BR_OFFSET_MS).toISOString().slice(0, 10).replace(/-/g, '');
}

/** Fim do dia (horário de Brasília) de uma data YYYYMMDD, em ms UTC. */
function endOfDayMs(yyyymmdd: string): number {
  const y = Number(yyyymmdd.slice(0, 4));
  const m = Number(yyyymmdd.slice(4, 6));
  const d = Number(yyyymmdd.slice(6, 8));
  return Date.UTC(y, m - 1, d, 23, 59, 59) + BR_OFFSET_MS;
}

async function codeSig(secret: string, id: string, exp: string): Promise<string> {
  const bytes = await hmac(secret, `code:${id}:${exp}`);
  return Array.from(bytes.slice(0, 5), (b) => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export async function generateCode(secret: string, days: number, nowMs: number): Promise<{ code: string; expiresAt: number }> {
  const rnd = crypto.getRandomValues(new Uint8Array(6));
  const id = Array.from(rnd, (b) => ALPHABET[b % ALPHABET.length]).join('');
  const exp = brDate(nowMs + days * DAY_MS);
  return { code: `TD-${id}-${exp}-${await codeSig(secret, id, exp)}`, expiresAt: endOfDayMs(exp) };
}

export async function verifyCode(
  secret: string,
  raw: string,
  nowMs: number,
  revoked: string[] = [],
): Promise<{ id: string; expiresAt: number } | null> {
  const m = CODE_RE.exec(raw.trim().toUpperCase());
  if (!m) return null;
  const [, id, exp, sig] = m;
  const expected = await codeSig(secret, id, exp);
  let diff = expected.length ^ sig.length;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ (sig.charCodeAt(i) || 0);
  if (diff !== 0) return null;
  const expiresAt = endOfDayMs(exp);
  if (expiresAt <= nowMs || revoked.includes(id)) return null;
  return { id, expiresAt };
}

/** Comparação sem vazar onde os textos diferem (compara os hashes). */
async function sameSecret(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

export interface Redeemed {
  plan: 'premium' | 'master';
  token: string;
  /** Quando o token expira (ms). */
  expiresAt: number;
}

/** Troca um código (master ou premium) por um token assinado. */
export async function redeem(env: Env, code: string, nowMs: number): Promise<Redeemed | null> {
  const secret = env.AUTH_SECRET;
  if (!secret) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;

  if (env.MASTER_CODE && (await sameSecret(trimmed, env.MASTER_CODE))) {
    const expiresAt = nowMs + TOKEN_TTL_MS;
    return { plan: 'master', expiresAt, token: await signToken(secret, { p: 'master', e: Math.floor(expiresAt / 1000), c: 'master' }) };
  }
  const revoked = (env.REVOKED_IDS ?? '').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
  const ok = await verifyCode(secret, trimmed, nowMs, revoked);
  if (!ok) return null;
  const expiresAt = Math.min(ok.expiresAt, nowMs + TOKEN_TTL_MS);
  return { plan: 'premium', expiresAt, token: await signToken(secret, { p: 'premium', e: Math.floor(expiresAt / 1000), c: ok.id }) };
}

export type AuthResult = { plan: Plan; invalid?: false } | { plan: 'free'; invalid: true };

/** Lê o token do cabeçalho. Sem token = free; token ruim ou vencido = inválido (o app renova). */
export async function authenticate(request: Request, env: Env, nowMs: number): Promise<AuthResult> {
  const header = request.headers.get('authorization');
  if (!header) return { plan: 'free' };
  const token = /^Bearer\s+(\S+)$/i.exec(header)?.[1];
  if (!token || !env.AUTH_SECRET) return { plan: 'free', invalid: true };
  const payload = await verifyToken(env.AUTH_SECRET, token, nowMs);
  return payload ? { plan: payload.p } : { plan: 'free', invalid: true };
}

/** "Dia" do contador de uso, no horário de Brasília. */
export function usageDay(nowMs: number): string {
  return brDate(nowMs);
}

/** Quando o contador do dia zera (ms UTC). */
export function nextReset(nowMs: number): number {
  return endOfDayMs(brDate(nowMs)) + 1000;
}
