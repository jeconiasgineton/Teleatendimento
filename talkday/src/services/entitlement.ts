import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { authHeaders, toApiError } from './auth';
import { PROXY_URL } from './config';

const DEVICE_KEY = 'talkday.device.v1';
const STORED_KEY = 'talkday.entitlement.v1';

export interface Stored {
  /** Código usado para ativar (guardado para renovar o token sozinho). */
  code: string;
  token: string;
  plan: 'premium' | 'master';
  /** Quando o token vence (ms). */
  expiresAt: number;
}

/** Id aleatório e anônimo deste aparelho (conta o limite diário do plano grátis). */
export async function loadDeviceId(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(DEVICE_KEY);
    if (saved && /^[A-Za-z0-9-]{16,64}$/.test(saved)) return saved;
  } catch {
    // segue e cria outro
  }
  const id = Crypto.randomUUID();
  try {
    await AsyncStorage.setItem(DEVICE_KEY, id);
  } catch {
    // sem persistência: vale só nesta sessão
  }
  return id;
}

function isStored(x: unknown): x is Stored {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<Stored>;
  return typeof s.code === 'string' && typeof s.token === 'string' && (s.plan === 'premium' || s.plan === 'master') && typeof s.expiresAt === 'number';
}

export async function loadStored(): Promise<Stored | null> {
  try {
    const raw = await SecureStore.getItemAsync(STORED_KEY);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return isStored(data) ? data : null;
  } catch {
    return null;
  }
}

export async function saveStored(s: Stored): Promise<void> {
  try {
    await SecureStore.setItemAsync(STORED_KEY, JSON.stringify(s));
  } catch {
    // sem cofre seguro: o plano vale só nesta sessão
  }
}

export async function clearStored(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(STORED_KEY);
  } catch {
    // ignora
  }
}

export type RedeemResult =
  | { ok: true; stored: Stored }
  | { ok: false; reason: 'invalid' | 'network' | 'unconfigured' | 'too_many' };

/** Troca um código (premium ou master) por um token assinado pelo servidor. */
export async function redeemCode(code: string): Promise<RedeemResult> {
  if (!PROXY_URL) return { ok: false, reason: 'unconfigured' };
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: 'invalid' };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(`${PROXY_URL}/redeem`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: trimmed }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timer));
    if (res.status === 429) return { ok: false, reason: 'too_many' };
    if (res.status === 503) return { ok: false, reason: 'unconfigured' };
    if (res.status === 403 || res.status === 400) return { ok: false, reason: 'invalid' };
    if (!res.ok) return { ok: false, reason: 'network' };
    const data = (await res.json()) as { plan?: unknown; token?: unknown; expiresAt?: unknown };
    if ((data.plan !== 'premium' && data.plan !== 'master') || typeof data.token !== 'string' || typeof data.expiresAt !== 'number') {
      return { ok: false, reason: 'network' };
    }
    return { ok: true, stored: { code: trimmed, token: data.token, plan: data.plan, expiresAt: data.expiresAt } };
  } catch {
    return { ok: false, reason: 'network' };
  }
}

/** Painel master: gera um código premium válido por `days` dias. */
export async function createPremiumCode(days: number): Promise<{ code: string; expiresAt: number }> {
  if (!PROXY_URL) throw new Error('unconfigured');
  const res = await fetch(`${PROXY_URL}/admin/code`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ days }),
  });
  if (!res.ok) throw await toApiError(res);
  const data = (await res.json()) as { code?: unknown; expiresAt?: unknown };
  if (typeof data.code !== 'string' || typeof data.expiresAt !== 'number') throw new Error('resposta inválida');
  return { code: data.code, expiresAt: data.expiresAt };
}
