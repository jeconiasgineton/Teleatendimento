import type { ChatRequest, ChatResult } from '@/domain/chat';
import type { CheckRequest, CheckResult, CoachRequest, ConversationTurn } from '@/domain/types';
import { authHeaders, emitUsage, toApiError } from '../auth.ts';
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
export function createRemoteClient(baseUrl: string): AIClient {
  const base = baseUrl.replace(/\/+$/, '');

  /** POST com identidade (aparelho + token do plano); erros do servidor viram ApiError. */
  async function post(path: string, body: unknown, ms: number): Promise<unknown> {
    const res = await fetchWithTimeout(
      `${base}${path}`,
      { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify(body) },
      ms,
    );
    if (!res.ok) throw await toApiError(res);
    return res.json();
  }

  return {
    async checkSentence(req: CheckRequest): Promise<CheckResult> {
      const data = await post(
        '/check',
        {
          mode: req.mode,
          level: req.level,
          sentence: req.sentence,
          targetWords: req.targetWords,
          context: req.context,
          accent: req.accent,
        },
        TIMEOUT_MS,
      );
      if (!isResult(data)) throw new Error('resposta inválida do proxy');
      if (data.usage) emitUsage(data.usage);
      return data;
    },
    async nextCoachTurn(req: CoachRequest): Promise<ConversationTurn> {
      const data = await post('/coach', req, COACH_TIMEOUT_MS);
      if (!isTurn(data)) throw new Error('resposta inválida do proxy');
      return { coach: data.coach, coachPt: data.coachPt, suggestion: data.suggestion };
    },
    async chat(req: ChatRequest): Promise<ChatResult> {
      const data = await post('/chat', req, CHAT_TIMEOUT_MS);
      if (!isChatResult(data)) throw new Error('resposta inválida do proxy');
      return data;
    },
  };
}
