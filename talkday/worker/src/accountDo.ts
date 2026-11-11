import type { ProgressData } from './types.ts';

const enc = new TextEncoder();
/** O limite do Workers para PBKDF2 é 100.000 iterações. */
export const PBKDF2_ITERATIONS = 100_000;
export const MAX_FAILS = 5;
export const LOCK_MS = 15 * 60_000;

interface Storage {
  get<T>(k: string): Promise<T | undefined>;
  put(k: string, v: unknown): Promise<void>;
}

interface Credential {
  salt: string;
  hash: string;
  iterations: number;
}

interface Fails {
  count: number;
  lockedUntil: number;
}

interface Data {
  version: number;
  data: ProgressData | null;
}

const b64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256));
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  let diff = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ (b[i] ?? 0);
  return diff === 0;
}

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

/**
 * Uma conta = um Durable Object (nome = chave irreversível de e-mail + celular).
 * Guarda o hash da senha, o histórico do aluno e o controle de tentativas.
 * Quem chama (o Worker) já validou o formato; aqui ficam a senha e o bloqueio.
 */
export class AccountDO {
  private readonly state: { storage: Storage };

  constructor(state: { storage: Storage }) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const op = new URL(request.url).pathname.slice(1);
    const body = (await request.json().catch(() => ({}))) as { password?: string; data?: ProgressData | null; baseVersion?: number; now?: number };
    const now = typeof body.now === 'number' ? body.now : Date.now();
    switch (op) {
      case 'signup':
        return this.signup(body.password ?? '', body.data ?? null);
      case 'login':
        return this.login(body.password ?? '', now);
      case 'get':
        return this.get();
      case 'put':
        return this.put(body.data ?? null, body.baseVersion);
      default:
        return json({ error: 'op inválida' }, 400);
    }
  }

  private async current(): Promise<Data> {
    return (await this.state.storage.get<Data>('data')) ?? { version: 0, data: null };
  }

  private async signup(password: string, data: ProgressData | null): Promise<Response> {
    if (await this.state.storage.get<Credential>('cred')) return json({ error: 'account_exists' }, 409);
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password, salt, PBKDF2_ITERATIONS);
    await this.state.storage.put('cred', { salt: b64(salt), hash: b64(hash), iterations: PBKDF2_ITERATIONS } satisfies Credential);
    const stored: Data = { version: data ? 1 : 0, data };
    await this.state.storage.put('data', stored);
    return json(stored);
  }

  private async login(password: string, now: number): Promise<Response> {
    const cred = await this.state.storage.get<Credential>('cred');
    const fails = (await this.state.storage.get<Fails>('fails')) ?? { count: 0, lockedUntil: 0 };
    if (fails.lockedUntil > now) return json({ error: 'locked', retryAfterMs: fails.lockedUntil - now }, 429);
    // Conta inexistente e senha errada dão a mesma resposta (não revela quem tem conta).
    const ok = cred ? sameBytes(await derive(password, unb64(cred.salt), cred.iterations), unb64(cred.hash)) : false;
    if (!ok) {
      if (cred) {
        const count = fails.count + 1;
        await this.state.storage.put('fails', { count: count >= MAX_FAILS ? 0 : count, lockedUntil: count >= MAX_FAILS ? now + LOCK_MS : 0 } satisfies Fails);
      }
      return json({ error: 'invalid_credentials' }, 401);
    }
    if (fails.count || fails.lockedUntil) await this.state.storage.put('fails', { count: 0, lockedUntil: 0 } satisfies Fails);
    return json(await this.current());
  }

  private async get(): Promise<Response> {
    if (!(await this.state.storage.get<Credential>('cred'))) return json({ error: 'not_found' }, 404);
    return json(await this.current());
  }

  /** Só grava se o aparelho partiu da versão mais recente; senão devolve a versão do servidor. */
  private async put(data: ProgressData | null, baseVersion: number | undefined): Promise<Response> {
    if (!(await this.state.storage.get<Credential>('cred'))) return json({ error: 'not_found' }, 404);
    const cur = await this.current();
    if (baseVersion !== cur.version) return json({ error: 'version_conflict', ...cur }, 409);
    const next: Data = { version: cur.version + 1, data };
    await this.state.storage.put('data', next);
    return json({ version: next.version });
  }
}
