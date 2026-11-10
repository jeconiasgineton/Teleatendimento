import type { CheckRequest, CheckResult } from '@/domain/types';
import type { AIClient } from './types';

const TIMEOUT_MS = 15000;

function isResult(x: unknown): x is CheckResult {
  if (typeof x !== 'object' || x === null) return false;
  const r = x as Record<string, unknown>;
  return typeof r.correct === 'boolean' && typeof r.corrected === 'string' && typeof r.explanationPt === 'string';
}

/** Chama o proxy (Cloudflare Worker) que guarda a chave do Gemini. */
export function createRemoteClient(baseUrl: string, appToken?: string): AIClient {
  const url = `${baseUrl.replace(/\/+$/, '')}/check`;
  return {
    async checkSentence(req: CheckRequest): Promise<CheckResult> {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(appToken ? { 'x-app-token': appToken } : {}) },
        body: JSON.stringify({
          mode: req.mode,
          sentence: req.sentence,
          targetWords: req.targetWords,
          context: req.context,
          accent: req.accent,
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`proxy ${res.status}`);
      const data: unknown = await res.json();
      if (!isResult(data)) throw new Error('resposta inválida do proxy');
      return data;
    },
  };
}
