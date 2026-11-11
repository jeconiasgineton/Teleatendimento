import { gradeReview, newItem, type ReviewItem } from './srs.ts';
import type { Lesson } from './types.ts';

export interface ProgressState {
  version: 1;
  startedAt: number;
  completed: Record<number, { score: number; at: number }>;
  /** Ids das palavras já aprendidas, na ordem em que apareceram. */
  learned: string[];
  reviews: Record<string, ReviewItem>;
  /** Melhor resultado (%) de cada pacote da aba Praticar. */
  practice: Record<string, { best: number; at: number }>;
  /** Sobe a cada "apagar progresso"; ao juntar dois aparelhos, a época maior vence. */
  epoch: number;
}

export interface LessonResult {
  totalSteps: number;
  /** Passos em que o aluno desistiu (pulou). */
  skipped: number;
  /** Palavras em que errou ao menos uma vez. */
  missedWordIds: string[];
}

export const GOAL_DAYS = 90;
/** A lição só conta se o aluno não desistiu de mais de 20% dos passos. */
export const MAX_SKIPPED_RATIO = 0.2;

export function initialProgress(now: number): ProgressState {
  return { version: 1, startedAt: now, completed: {}, learned: [], reviews: {}, practice: {}, epoch: 0 };
}

/** Apaga o progresso e marca uma nova época, para outros aparelhos da conta não o trazerem de volta. */
export function resetProgress(prev: ProgressState, now: number): ProgressState {
  return { ...initialProgress(now), epoch: prev.epoch + 1 };
}

export function lessonPassed(r: Pick<LessonResult, 'totalSteps' | 'skipped'>): boolean {
  return r.totalSteps > 0 && r.skipped / r.totalSteps <= MAX_SKIPPED_RATIO;
}

/** Nota 0-100: percentual de passos sem desistir. */
export function lessonScore(r: Pick<LessonResult, 'totalSteps' | 'skipped'>): number {
  return r.totalSteps === 0 ? 0 : Math.round(((r.totalSteps - r.skipped) / r.totalSteps) * 100);
}

export type LessonStatus = 'completed' | 'current' | 'locked';

/** Menor id ainda não concluído; null quando o curso terminou. */
export function currentLessonId(state: ProgressState, lessons: Lesson[]): number | null {
  const next = lessons.find((l) => !state.completed[l.id]);
  return next ? next.id : null;
}

export function lessonStatus(state: ProgressState, id: number, lessons: Lesson[]): LessonStatus {
  if (state.completed[id]) return 'completed';
  return currentLessonId(state, lessons) === id ? 'current' : 'locked';
}

export function applyLessonResult(state: ProgressState, lesson: Lesson, result: LessonResult, now: number): ProgressState {
  if (!lessonPassed(result)) return state;
  // Segurança: uma lição só libera depois das anteriores.
  const status = state.completed[lesson.id] ? 'completed' : state.completed[lesson.id - 1] || lesson.id === 1 ? 'ok' : 'locked';
  if (status === 'locked') return state;

  const missed = new Set(result.missedWordIds);
  const learned = [...state.learned];
  const reviews = { ...state.reviews };
  for (const w of lesson.words) {
    if (!learned.includes(w.id)) learned.push(w.id);
    const existing = reviews[w.id];
    if (!existing) reviews[w.id] = newItem(w.id, now, missed.has(w.id));
    else if (missed.has(w.id)) reviews[w.id] = gradeReview(existing, false, now);
  }
  const score = lessonScore(result);
  const prev = state.completed[lesson.id];
  return {
    ...state,
    learned,
    reviews,
    completed: { ...state.completed, [lesson.id]: { score: Math.max(score, prev?.score ?? 0), at: prev?.at ?? now } },
  };
}

export function applyReviewResult(state: ProgressState, wordId: string, correct: boolean, now: number): ProgressState {
  const item = state.reviews[wordId];
  if (!item) return state;
  return { ...state, reviews: { ...state.reviews, [wordId]: gradeReview(item, correct, now) } };
}

export interface CourseStats {
  wordsLearned: number;
  totalWords: number;
  lessonsDone: number;
  totalLessons: number;
  /** Dia atual do curso (1 = primeiro dia), limitado ao objetivo. */
  day: number;
  goalDays: number;
  /** 0-100: palavras aprendidas / palavras do curso. */
  percent: number;
}

export function courseStats(state: ProgressState, lessons: Lesson[], now: number): CourseStats {
  const totalWords = lessons.reduce((n, l) => n + l.words.length, 0);
  const wordsLearned = state.learned.length;
  const day = Math.min(GOAL_DAYS, Math.max(1, Math.floor((now - state.startedAt) / 86400000) + 1));
  return {
    wordsLearned,
    totalWords,
    lessonsDone: Object.keys(state.completed).length,
    totalLessons: lessons.length,
    day,
    goalDays: GOAL_DAYS,
    percent: totalWords ? Math.round((wordsLearned / totalWords) * 100) : 0,
  };
}
