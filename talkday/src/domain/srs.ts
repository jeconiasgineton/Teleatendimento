/**
 * Revisão espaçada (caixas de Leitner). Sem dependências: fácil de testar.
 * Acerto sobe uma caixa e aumenta o intervalo; erro desce duas caixas e a
 * palavra volta em poucos minutos.
 */
export interface ReviewItem {
  wordId: string;
  box: number;
  /** Quando a palavra volta a ficar disponível (epoch ms). */
  due: number;
  lapses: number;
  lastReviewed: number | null;
}

export const DAY_MS = 24 * 60 * 60 * 1000;
/** Intervalo (dias) por caixa. */
export const INTERVAL_DAYS = [0, 1, 3, 7, 14, 30, 60] as const;
export const MAX_BOX = INTERVAL_DAYS.length - 1;
export const WRONG_DELAY_MS = 10 * 60 * 1000;

/** Palavra recém-aprendida: sem erro vai para amanhã; com erro volta já. */
export function newItem(wordId: string, now: number, missed: boolean): ReviewItem {
  return missed
    ? { wordId, box: 0, due: now, lapses: 1, lastReviewed: now }
    : { wordId, box: 1, due: now + INTERVAL_DAYS[1] * DAY_MS, lapses: 0, lastReviewed: now };
}

export function gradeReview(item: ReviewItem, correct: boolean, now: number): ReviewItem {
  if (correct) {
    const box = Math.min(item.box + 1, MAX_BOX);
    return { ...item, box, due: now + INTERVAL_DAYS[box] * DAY_MS, lastReviewed: now };
  }
  return {
    ...item,
    box: Math.max(0, item.box - 2),
    due: now + WRONG_DELAY_MS,
    lapses: item.lapses + 1,
    lastReviewed: now,
  };
}

export function dueItems(items: ReviewItem[], now: number): ReviewItem[] {
  return items.filter((i) => i.due <= now).sort((a, b) => a.due - b.due);
}

export function nextDue(items: ReviewItem[], now: number): number | null {
  const future = items.filter((i) => i.due > now).map((i) => i.due);
  return future.length ? Math.min(...future) : null;
}

/** "daqui a 2 h", "amanhã"... para a tela de revisão. */
export function formatWait(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60000));
  if (min < 60) return `${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? '1 dia' : `${d} dias`;
}
