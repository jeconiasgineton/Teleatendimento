/** Identidade da requisição ao proxy: aparelho anônimo + token do plano (se houver). */

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly limit?: number;
  readonly resetsAt?: number;

  constructor(status: number, code: string, extra?: { limit?: number; resetsAt?: number }) {
    super(`${status} ${code}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.limit = extra?.limit;
    this.resetsAt = extra?.resetsAt;
  }
}

let deviceId = '';
let token: string | null = null;

export function setAuth(next: { deviceId?: string; token?: string | null }): void {
  if (next.deviceId !== undefined) deviceId = next.deviceId;
  if (next.token !== undefined) token = next.token;
}

export function authHeaders(): Record<string, string> {
  return {
    ...(deviceId ? { 'x-device-id': deviceId } : {}),
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };
}

type Usage = { used: number; limit: number };
const invalidListeners = new Set<() => void>();
const usageListeners = new Set<(u: Usage) => void>();

export function onTokenInvalid(fn: () => void): () => void {
  invalidListeners.add(fn);
  return () => invalidListeners.delete(fn);
}
export function emitTokenInvalid(): void {
  invalidListeners.forEach((fn) => fn());
}
export function onUsage(fn: (u: Usage) => void): () => void {
  usageListeners.add(fn);
  return () => usageListeners.delete(fn);
}
export function emitUsage(u: Usage): void {
  usageListeners.forEach((fn) => fn(u));
}

/** Lê o erro JSON do proxy ({ error, limit?, resetsAt? }) e vira ApiError. */
export async function toApiError(res: Response): Promise<ApiError> {
  let body: { error?: unknown; limit?: unknown; resetsAt?: unknown } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    // corpo não era JSON
  }
  const err = new ApiError(res.status, typeof body.error === 'string' ? body.error : `http_${res.status}`, {
    limit: typeof body.limit === 'number' ? body.limit : undefined,
    resetsAt: typeof body.resetsAt === 'number' ? body.resetsAt : undefined,
  });
  if (err.code === 'token_invalid') emitTokenInvalid();
  return err;
}
