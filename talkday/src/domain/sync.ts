import type { ProgressState } from './progress.ts';
import type { ReviewItem } from './srs.ts';

/** Estado novo ou salvo antes das contas: garante os campos que podem faltar. */
export function normalizeProgress(s: ProgressState): ProgressState {
  return { ...s, practice: s.practice ?? {}, epoch: s.epoch ?? 0 };
}

export function isEmptyProgress(s: ProgressState): boolean {
  return s.learned.length === 0 && Object.keys(s.completed).length === 0 && Object.keys(s.practice).length === 0;
}

function sorted<T>(o: Record<string, T>): [string, T][] {
  return Object.keys(o).sort().map((k) => [k, o[k]]);
}

/** Texto estável do estado: dois estados iguais dão o mesmo texto (para saber se há o que sincronizar). */
export function fingerprint(s: ProgressState): string {
  return JSON.stringify([s.version, s.startedAt, s.epoch, sorted(s.completed), s.learned, sorted(s.reviews), sorted(s.practice)]);
}

const reviewedAt = (r: ReviewItem) => r.lastReviewed ?? -1;

/**
 * Junta o histórico de dois aparelhos da mesma conta sem perder nada:
 * lições e palavras somam, a nota e o melhor resultado ficam com o maior,
 * e cada palavra da revisão fica com o registro mais recente.
 * "Apagar progresso" aumenta a época, e a época maior vence por inteiro.
 */
export function mergeProgress(a: ProgressState, b: ProgressState): ProgressState {
  const x = normalizeProgress(a);
  const y = normalizeProgress(b);
  if (x.epoch !== y.epoch) return x.epoch > y.epoch ? x : y;

  const completed = { ...x.completed };
  for (const [id, v] of Object.entries(y.completed)) {
    const cur = completed[Number(id)];
    completed[Number(id)] = cur ? { score: Math.max(cur.score, v.score), at: Math.min(cur.at, v.at) } : v;
  }

  const learned = [...x.learned];
  const seen = new Set(learned);
  for (const id of y.learned) if (!seen.has(id)) learned.push(id);

  const reviews = { ...x.reviews };
  for (const [id, r] of Object.entries(y.reviews)) {
    const cur = reviews[id];
    if (!cur || reviewedAt(r) > reviewedAt(cur)) reviews[id] = r;
  }

  const practice = { ...x.practice };
  for (const [id, p] of Object.entries(y.practice)) {
    const cur = practice[id];
    practice[id] = cur ? { best: Math.max(cur.best, p.best), at: Math.max(cur.at, p.at) } : p;
  }

  return { version: 1, startedAt: Math.min(x.startedAt, y.startedAt), epoch: x.epoch, completed, learned, reviews, practice };
}
