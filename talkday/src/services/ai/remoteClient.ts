import type { ChatRequest, ChatResult } from '@/domain/chat';
import type { CheckRequest, CheckResult, CoachRequest, ConversationTurn } from '@/domain/types';
import type { AIClient } from './types';

const TIMEOUT_MS = 15000;
/** A pergunta do coach tem fallback local, então não vale esperar muito. */
const COACH_TIMEOUT_MS = 8000;
const CHAT_TIMEOUT_MS = 15000;

/** AbortSignal.timeout não existe em todos os runtimes do React Native (Hermes). */
async function fetchWithTimeout(url: string, init: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function isResult(x: unknown): x is CheckResult {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.correct === 'boolean' && typeof r.corrected === 'string' && typeof r.explanationPt === 'string';
}

function isTurn(x: unknown): x is ConversationTurn {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return [r.coach, r.coachPt, r.suggestion].every((v) => typeof v === 'string' && v.trim().length > 0);
}

function isChatResult(x: unknown): x is ChatResult {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return (
    Array.isArray(r.segments) &&
    r.segments.length > 0 &&
    r.segments.every((s) => {
      const seg = s as Record<string, unknown> | null;
      return typeof seg === 'object' && seg !== null && (seg.lang === 'en' || seg.lang === 'pt') && typeof seg.text === 'string' && seg.text.trim().length > 0;
    }) &&
    (r.nextListen === 'en' || r.nextListen === 'pt') &&
    typeof r.end === 'boolean'
  );
}

/** Chama o proxy (Cloudflare Worker) que guarda a chave do Gemini. */
export function createRemoteClient(baseUrl: string, appToken?: string): AIClient {
  const base = baseUrl.replace(/\/+$/, '');
  const url = `${base}/check`;
  const headers = { 'content-type': 'application/json', ...(appToken ? { 'x-app-token': appToken } : {}) };
  return {
    async checkSentence(req: CheckRequest): Promise<CheckResult> {
      const res = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            mode: req.mode,
            sentence: req.sentence,
            targetWords: req.targetWords,
            context: req.context,
            accent: req.accent,
          }),
        },
        TIMEOUT_MS,
      );
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      const data: unknown = await res.json();
      if (!isResult(data)) throw new Error('resposta inválida do proxy');
      return data;
    },
    async nextCoachTurn(req: CoachRequest): Promise<ConversationTurn> {
      const res = await fetchWithTimeout(`${base}/coach`, { method: 'POST', headers, body: JSON.stringify(req) }, COACH_TIMEOUT_MS);
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      const data: unknown = await res.json();
      if (!isTurn(data)) throw new Error('resposta inválida do proxy');
      return { coach: data.coach, coachPt: data.coachPt, suggestion: data.suggestion };
    },
    async chat(req: ChatRequest): Promise<ChatResult> {
      const res = await fetchWithTimeout(`${base}/chat`, { method: 'POST', headers, body: JSON.stringify(req) }, CHAT_TIMEOUT_MS);
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      const data: unknown = await res.json();
      if (!isChatResult(data)) throw new Error('resposta inválida do proxy');
      return data;
    },
  };
}
