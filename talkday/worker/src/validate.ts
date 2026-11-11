import type { CheckRequest, CheckResult, ChatRequest, ChatResult, CoachRequest, CoachResult, Issue, IssueType, Level } from './types.ts';

export const LEVELS: Level[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
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
  const level = LEVELS.includes(b.level as Level) ? (b.level as Level) : undefined;
  return { ok: true, value: { mode: b.mode, sentence, targetWords, context, accent, level } };
}

const ISSUE_TYPES: IssueType[] = ['grammar', 'word-choice', 'context', 'spelling', 'naturalness', 'missing-target'];
const MAX_ISSUES = 4;

function cleanIssues(raw: unknown): Issue[] {
  if (!Array.isArray(raw)) return [];
  const out: Issue[] = [];
  for (const it of raw) {
    const r = it as Record<string, unknown> | null;
    if (typeof r !== 'object' || r === null) continue;
    if (!ISSUE_TYPES.includes(r.type as IssueType)) continue;
    if (typeof r.original !== 'string' || typeof r.fix !== 'string' || typeof r.explanationPt !== 'string') continue;
    const original = clean(r.original).slice(0, 120);
    const fix = clean(r.fix).slice(0, 120);
    const explanationPt = clean(r.explanationPt).slice(0, 200);
    if (!explanationPt) continue;
    out.push({ type: r.type as IssueType, original, fix, explanationPt });
    if (out.length === MAX_ISSUES) break;
  }
  return out;
}

/** Garante o formato da resposta mesmo que o modelo devolva algo torto. */
export function normalizeResult(raw: unknown, req: CheckRequest): CheckResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.correct !== 'boolean') return null;

  const corrected = typeof r.corrected === 'string' && r.corrected.trim() ? clean(r.corrected).slice(0, MAX_SENTENCE) : req.sentence;
  const issues = cleanIssues(r.issues);
  // Só dicas de naturalidade não reprovam a frase; qualquer outro problema reprova.
  const blocking = issues.some((i) => i.type !== 'naturalness');
  const correct = r.correct && !blocking;

  let explanation = typeof r.explanationPt === 'string' ? clean(r.explanationPt).slice(0, 300) : '';
  if (!correct && !explanation) explanation = issues.find((i) => i.type !== 'naturalness')?.explanationPt ?? '';
  if (!correct && !explanation) return null;

  const result: CheckResult = { correct, corrected, explanationPt: correct ? '' : explanation };
  if (issues.length) result.issues = issues;
  const natural = typeof r.natural === 'string' ? clean(r.natural).slice(0, MAX_SENTENCE) : '';
  if (natural && natural.toLowerCase() !== corrected.toLowerCase()) result.natural = natural;
  if (correct && req.mode === 'conversation') {
    const en = typeof r.replyEn === 'string' ? clean(r.replyEn).slice(0, 160) : '';
    const pt = typeof r.replyPt === 'string' ? clean(r.replyPt).slice(0, 160) : '';
    if (en) result.reply = { en, pt };
  }
  return result;
}

export const MAX_HISTORY = 3;
export const MAX_TOPIC = 120;

export function parseCoachRequest(body: unknown): { ok: true; value: CoachRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' };
  const b = body as Record<string, unknown>;

  if (!Array.isArray(b.words) || b.words.length === 0 || b.words.length > MAX_TARGETS) return { ok: false, error: 'words inválido' };
  const words: string[] = [];
  for (const w of b.words) {
    if (typeof w !== 'string') return { ok: false, error: 'words inválido' };
    const t = clean(w);
    if (!t || t.length > MAX_WORD) return { ok: false, error: 'words inválido' };
    words.push(t);
  }

  const history: CoachRequest['history'] = [];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history) || b.history.length > MAX_HISTORY) return { ok: false, error: 'history inválido' };
    for (const h of b.history) {
      const turn = h as Record<string, unknown> | null;
      if (typeof turn !== 'object' || turn === null || typeof turn.coach !== 'string' || typeof turn.student !== 'string') {
        return { ok: false, error: 'history inválido' };
      }
      const coach = clean(turn.coach);
      const student = clean(turn.student);
      if (coach.length > MAX_CONTEXT || student.length > MAX_SENTENCE) return { ok: false, error: 'history inválido' };
      history.push({ coach, student });
    }
  }
  let topic: string | undefined;
  if (b.topic !== undefined) {
    if (typeof b.topic !== 'string') return { ok: false, error: 'topic inválido' };
    topic = clean(b.topic);
    if (topic.length > MAX_TOPIC) return { ok: false, error: 'topic muito longo' };
    topic = topic || undefined;
  }
  return { ok: true, value: { words, history, accent: b.accent === 'en-GB' ? 'en-GB' : 'en-US', topic } };
}

const tokens = (s: string): string[] => s.toLowerCase().match(/[a-z']+/g) ?? [];

/** Só aceita a pergunta se vier completa e a resposta-modelo usar uma palavra da lição. */
export function normalizeCoach(raw: unknown, req: CoachRequest): CoachResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.coach !== 'string' || typeof r.coachPt !== 'string' || typeof r.suggestion !== 'string') return null;
  const coach = clean(r.coach);
  const coachPt = clean(r.coachPt);
  const suggestion = clean(r.suggestion);
  if (!coach || !coachPt || !suggestion) return null;
  if (coach.length > 120 || coachPt.length > 140 || suggestion.length > 100) return null;
  const targets = req.words.map((w) => w.toLowerCase());
  if (!tokens(suggestion).some((t) => targets.includes(t))) return null;
  // A pergunta não pode ser repetida de um turno anterior.
  if (req.history.some((h) => h.coach.toLowerCase() === coach.toLowerCase())) return null;
  return { coach, coachPt, suggestion };
}

export const MAX_CHAT_TURNS = 12;
export const MAX_CHAT_TEXT = 300;
export const MAX_CHAT_WORDS = 40;
const MAX_SEGMENTS = 4;

export function parseChatRequest(body: unknown): { ok: true; value: ChatRequest } | { ok: false; error: string } {
  if (typeof body !== 'object' || body === null) return { ok: false, error: 'corpo inválido' };
  const b = body as Record<string, unknown>;

  const history: ChatRequest['history'] = [];
  if (b.history !== undefined) {
    if (!Array.isArray(b.history) || b.history.length > MAX_CHAT_TURNS) return { ok: false, error: 'history inválido' };
    for (const h of b.history) {
      const t = h as Record<string, unknown> | null;
      if (typeof t !== 'object' || t === null || (t.role !== 'ai' && t.role !== 'user') || typeof t.text !== 'string') {
        return { ok: false, error: 'history inválido' };
      }
      const text = clean(t.text);
      if (!text || text.length > MAX_CHAT_TEXT) return { ok: false, error: 'history inválido' };
      history.push({ role: t.role, text });
    }
  }

  let userText: string | undefined;
  if (b.userText !== undefined) {
    if (typeof b.userText !== 'string') return { ok: false, error: 'userText inválido' };
    userText = clean(b.userText);
    if (userText.length > MAX_CHAT_TEXT) return { ok: false, error: 'userText muito longo' };
    userText = userText || undefined;
  }

  let confidence: number | undefined;
  if (b.confidence !== undefined) {
    if (typeof b.confidence !== 'number' || !(b.confidence >= 0 && b.confidence <= 1)) return { ok: false, error: 'confidence inválido' };
    confidence = b.confidence;
  }

  const silence = b.silence === true;
  if (b.silence !== undefined && typeof b.silence !== 'boolean') return { ok: false, error: 'silence inválido' };
  if (silence && userText) return { ok: false, error: 'silence e userText juntos' };

  const words: string[] = [];
  if (b.words !== undefined) {
    if (!Array.isArray(b.words) || b.words.length > MAX_CHAT_WORDS) return { ok: false, error: 'words inválido' };
    for (const w of b.words) {
      if (typeof w !== 'string') return { ok: false, error: 'words inválido' };
      const t = clean(w);
      if (!t || t.length > MAX_WORD) return { ok: false, error: 'words inválido' };
      words.push(t);
    }
  }

  return {
    ok: true,
    value: {
      history,
      userText,
      confidence,
      silence: silence || undefined,
      listenedAs: b.listenedAs === 'pt' ? 'pt' : b.listenedAs === 'en' ? 'en' : undefined,
      words,
      accent: b.accent === 'en-GB' ? 'en-GB' : 'en-US',
    },
  };
}

/** Garante segmentos válidos, curtos e com idioma conhecido; senão a resposta é descartada. */
export function normalizeChat(raw: unknown): ChatResult | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.segments) || r.segments.length === 0 || r.segments.length > MAX_SEGMENTS) return null;

  const segments: ChatResult['segments'] = [];
  let total = 0;
  for (const s of r.segments) {
    const seg = s as Record<string, unknown> | null;
    if (typeof seg !== 'object' || seg === null || (seg.lang !== 'en' && seg.lang !== 'pt') || typeof seg.text !== 'string') return null;
    const text = clean(seg.text);
    if (!text || text.length > 220) return null;
    total += text.length;
    segments.push({ lang: seg.lang, text });
  }
  if (total > 500) return null;
  return { segments, nextListen: r.nextListen === 'pt' ? 'pt' : 'en', end: r.end === true };
}
