import type { ProgressData } from './types.ts';

const enc = new TextEncoder();

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const e = raw.trim().toLowerCase();
  if (e.length < 5 || e.length > 120) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/**
 * Só dígitos. Sem "+" assume Brasil (DDD + número, 10 ou 11 dígitos) e acrescenta 55;
 * com "+" já é internacional e não mexe.
 */
export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  let d = trimmed.replace(/\D/g, '');
  if (!trimmed.startsWith('+')) {
    d = d.replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = `55${d}`;
  }
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export function passwordProblem(password: unknown, email: string): 'weak_password' | null {
  if (typeof password !== 'string') return 'weak_password';
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) return 'weak_password';
  if (password.toLowerCase() === email || /^(.)\1+$/.test(password)) return 'weak_password';
  return null;
}

/**
 * Chave única da conta: HMAC do par e-mail + celular com um segredo do servidor.
 * É irreversível e nada legível fica guardado.
 */
export async function accountKey(secret: string, email: string, phone: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(`acct:${email}|${phone}`)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** "j***@gmail.com" */
export function emailHint(email: string): string {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 1)}***@${domain}`;
}

/** "***-1234" */
export function phoneHint(phone: string): string {
  return `***-${phone.slice(-4)}`;
}

// ---- progresso: valida e limita o que o app envia ----

const MAX_COMPLETED = 120;
const MAX_LEARNED = 600;
const MAX_REVIEWS = 600;
const MAX_PRACTICE = 60;
const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Devolve uma cópia limpa do progresso ou null se for inválido ou grande demais. */
export function parseProgressData(raw: unknown): ProgressData | null {
  if (!isObj(raw) || raw.version !== 1 || !isNum(raw.startedAt)) return null;
  const epoch = raw.epoch === undefined ? 0 : raw.epoch;
  if (!isNum(epoch) || !Number.isInteger(epoch) || epoch < 0) return null;

  if (!isObj(raw.completed) || Object.keys(raw.completed).length > MAX_COMPLETED) return null;
  const completed: ProgressData['completed'] = {};
  for (const [k, v] of Object.entries(raw.completed)) {
    if (!/^\d{1,3}$/.test(k) || !isObj(v) || !isNum(v.score) || !isNum(v.at)) return null;
    completed[k] = { score: Math.max(0, Math.min(100, Math.round(v.score))), at: v.at };
  }

  if (!Array.isArray(raw.learned) || raw.learned.length > MAX_LEARNED) return null;
  const learned: string[] = [];
  for (const id of raw.learned) {
    if (typeof id !== 'string' || id.length === 0 || id.length > 40) return null;
    learned.push(id);
  }

  if (!isObj(raw.reviews) || Object.keys(raw.reviews).length > MAX_REVIEWS) return null;
  const reviews: ProgressData['reviews'] = {};
  for (const [k, v] of Object.entries(raw.reviews)) {
    if (k.length > 40 || !isObj(v) || typeof v.wordId !== 'string' || v.wordId.length > 40) return null;
    if (!isNum(v.box) || !Number.isInteger(v.box) || v.box < 0 || v.box > 10) return null;
    if (!isNum(v.due) || !isNum(v.lapses) || !Number.isInteger(v.lapses) || v.lapses < 0) return null;
    if (v.lastReviewed !== null && !isNum(v.lastReviewed)) return null;
    reviews[k] = { wordId: v.wordId, box: v.box, due: v.due, lapses: v.lapses, lastReviewed: v.lastReviewed };
  }

  const practiceRaw = raw.practice === undefined ? {} : raw.practice;
  if (!isObj(practiceRaw) || Object.keys(practiceRaw).length > MAX_PRACTICE) return null;
  const practice: ProgressData['practice'] = {};
  for (const [k, v] of Object.entries(practiceRaw)) {
    if (k.length > 40 || !isObj(v) || !isNum(v.best) || !isNum(v.at)) return null;
    practice[k] = { best: Math.max(0, Math.min(100, Math.round(v.best))), at: v.at };
  }

  return { version: 1, startedAt: raw.startedAt, epoch, completed, learned, reviews, practice };
}
