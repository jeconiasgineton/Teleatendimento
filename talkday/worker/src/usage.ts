import type { Env } from './types.ts';

/** Um contador por chave (ex.: aparelho + dia). Fica num Durable Object com SQLite. */
interface Storage {
  get<T>(k: string): Promise<T | undefined>;
  put(k: string, v: unknown): Promise<void>;
}

export class UsageCounter {
  private readonly state: { storage: Storage };

  constructor(state: { storage: Storage }) {
    this.state = state;
  }

  async fetch(): Promise<Response> {
    const n = ((await this.state.storage.get<number>('n')) ?? 0) + 1;
    await this.state.storage.put('n', n);
    return new Response(String(n));
  }
}

/** Soma 1 e devolve o total. Sem o binding USAGE (testes/local) devolve 0 = sem limite. */
export async function bump(env: Env, key: string): Promise<number> {
  if (!env.USAGE) return 0;
  const stub = env.USAGE.get(env.USAGE.idFromName(key));
  const n = Number(await (await stub.fetch(new Request('https://usage/bump', { method: 'POST' }))).text());
  return Number.isFinite(n) ? n : 0;
}
