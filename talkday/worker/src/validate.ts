import type { CheckRequest, CheckResult } from './types.ts';

export const MAX_SENTENCE = 200;
export const MAX_CONTEXT = 200;
export const MAX_TARGETS = 10;
export const MAX_WORD = 30;

const clean = (s: string) => s.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();

export function parseCheckRequest(body: unknown): { ok: true; value: CheckRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' };
  const b = body as Record<string, unknown>;

  if (b.mode !== 'sentence' && b.mode !== 'conversation') return { ok: false, error: 'mode inválido' };
  if (typeof b.sentence !== 'string') return { ok: false, error: 'sentence ausente' };
  const sentence = clean(b.sentence);
  if (!sentence) return { ok: false, error: 'sentence vazia' };
  if (sentence.length > MAX_SENTENCE) return { ok: false, error: 'sentence muito longa' };

  if (!Array.isArray(b.targetWords) || b.targetWords.length === 0 || b.targetWords.length > MAX_TARGETS) {
    return { ok: false, error: 'targetWords inválido' };
  }
  const targetWords: string[] = [];
  for (const w of b.targetWords) {
    if (typeof w !== 'string') return { ok: false, error: 'targetWords inválido' };
    const t = clean(w);
    if (!t || t.length > MAX_WORD) return { ok: false, error: 'targetWords inválido' };
    targetWords.push(t);
  }

  let context: string | undefined;
  if (b.context !== undefined) {
    if (typeof b.context !== 'string') return { ok: false, error: 'context inválido' };
    context = clean(b.context).slice(0, MAX_CONTEXT) || undefined;
  }
  if (b.mode === 'conversation' && !context) return { ok: false, error: 'context obrigatório na conversa' };

  const accent = b.accent === 'en-GB' ? 'en-GB' : 'en-US';
  return { ok: true, value: { mode: b.mode, sentence, targetWords, context, accent } };
}

/** Garante o formato da resposta mesmo que o modelo devolva algo torto. */
export function normalizeResult(raw: unknown, req: CheckRequest): CheckResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.correct !== 'boolean') return null;

  const corrected = typeof r.corrected === 'string' && r.corrected.trim() ? clean(r.corrected).slice(0, MAX_SENTENCE) : req.sentence;
  const explanation = typeof r.explanationPt === 'string' ? clean(r.explanationPt).slice(0, 300) : '';
  if (!r.correct && !explanation) return null;

  const result: CheckResult = { correct: r.correct, corrected, explanationPt: r.correct ? '' : explanation };
  if (r.correct && req.mode === 'conversation') {
    const en = typeof r.replyEn === 'string' ? clean(r.replyEn).slice(0, 160) : '';
    const pt = typeof r.replyPt === 'string' ? clean(r.replyPt).slice(0, 160) : '';
    if (en) result.reply = { en, pt };
  }
  return result;
}
