import * as SecureStore from 'expo-secure-store';
import type { ProgressState } from '@/domain/progress';
import { PROXY_URL } from './config';

const STORE_KEY = 'talkday.account.v1';

export interface Session {
  token: string;
  /** Quando a sessão vence (ms). */
  expiresAt: number;
}

/** Sessão guardada no aparelho (a senha nunca é guardada). */
export interface StoredAccount extends Session {
  version: number;
  emailHint: string;
  phoneHint: string;
}

export type AccountError =
  | 'invalid_email'
  | 'invalid_phone'
  | 'weak_password'
  | 'invalid_credentials'
  | 'account_exists'
  | 'locked'
  | 'too_many_attempts'
  | 'invalid_data'
  | 'unconfigured'
  | 'session_invalid'
  | 'network'
  | 'server';

export type Failure = { ok: false; error: AccountError; retryAfterMs?: number };

export interface Entered {
  ok: true;
  session: Session;
  version: number;
  data: ProgressState | null;
  emailHint: string;
  phoneHint: string;
}

const KNOWN: AccountError[] = [
  'invalid_email', 'invalid_phone', 'weak_password', 'invalid_credentials', 'account_exists', 'locked',
  'too_many_attempts', 'invalid_data', 'unconfigured', 'session_invalid',
];

async function call(path: string, body: unknown, session?: string): Promise<{ status: number; body: Record<string, unknown> } | 'network'> {
  if (!PROXY_URL) return { status: 503, body: { error: 'unconfigured' } };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${PROXY_URL}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(session ? { 'x-session': session } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { status: res.status, body: json };
  } catch {
    return 'network';
  } finally {
    clearTimeout(timer);
  }
}

function failure(r: { status: number; body: Record<string, unknown> } | 'network'): Failure {
  if (r === 'network') return { ok: false, error: 'network' };
  const code = r.body.error;
  const error = KNOWN.includes(code as AccountError) ? (code as AccountError) : 'server';
  return { ok: false, error, retryAfterMs: typeof r.body.retryAfterMs === 'number' ? r.body.retryAfterMs : undefined };
}

function entered(body: Record<string, unknown>): Entered | null {
  const s = body.session as Session | undefined;
  if (!s || typeof s.token !== 'string' || typeof s.expiresAt !== 'number' || typeof body.version !== 'number') return null;
  return {
    ok: true,
    session: s,
    version: body.version,
    data: (body.data as ProgressState | null) ?? null,
    emailHint: String(body.emailHint ?? ''),
    phoneHint: String(body.phoneHint ?? ''),
  };
}

export async function signUp(email: string, phone: string, password: string, data?: ProgressState): Promise<Entered | Failure> {
  const r = await call('/account/signup', { email, phone, password, data });
  if (r === 'network' || r.status !== 200) return failure(r);
  return entered(r.body) ?? { ok: false, error: 'server' };
}

export async function logIn(email: string, phone: string, password: string): Promise<Entered | Failure> {
  const r = await call('/account/login', { email, phone, password });
  if (r === 'network' || r.status !== 200) return failure(r);
  return entered(r.body) ?? { ok: false, error: 'server' };
}

export async function refreshSession(session: string): Promise<{ ok: true; session: Session } | Failure> {
  const r = await call('/account/refresh', {}, session);
  if (r === 'network' || r.status !== 200) return failure(r);
  const s = r.body.session as Session | undefined;
  return s && typeof s.token === 'string' && typeof s.expiresAt === 'number' ? { ok: true, session: s } : { ok: false, error: 'server' };
}

export async function fetchData(session: string): Promise<{ ok: true; version: number; data: ProgressState | null } | Failure> {
  const r = await call('/account/get', {}, session);
  if (r === 'network' || r.status !== 200) return failure(r);
  return { ok: true, version: Number(r.body.version ?? 0), data: (r.body.data as ProgressState | null) ?? null };
}

export type PutResult =
  | { ok: true; version: number }
  | { ok: false; conflict: { version: number; data: ProgressState | null } }
  | Failure;

export async function putData(session: string, data: ProgressState, baseVersion: number): Promise<PutResult> {
  const r = await call('/account/put', { data, baseVersion }, session);
  if (r === 'network') return failure(r);
  if (r.status === 200) return { ok: true, version: Number(r.body.version ?? baseVersion + 1) };
  if (r.status === 409 && r.body.error === 'version_conflict') {
    return { ok: false, conflict: { version: Number(r.body.version ?? 0), data: (r.body.data as ProgressState | null) ?? null } };
  }
  return failure(r);
}

// ---- sessão guardada no aparelho ----

export async function loadAccount(): Promise<StoredAccount | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<StoredAccount>;
    return typeof a.token === 'string' && typeof a.expiresAt === 'number' && typeof a.version === 'number' ? (a as StoredAccount) : null;
  } catch {
    return null;
  }
}

export async function saveAccount(a: StoredAccount): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(a));
  } catch {
    // sem cofre seguro: a conta vale só nesta sessão do app
  }
}

export async function clearAccount(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORE_KEY);
  } catch {
    // ignora
  }
}
