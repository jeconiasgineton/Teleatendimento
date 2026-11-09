import type { Lesson, Step, Word } from './types';

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Monta as três partes do exercício:
 * 1) reconhecer cada palavra, 2) usar cada palavra numa frase, 3) mini conversa.
 * `pool` fornece traduções extras para as alternativas erradas.
 */
export function buildSteps(lesson: Lesson, pool: Word[]): Step[] {
  const recognize: Step[] = shuffle(lesson.words).map((word) => {
    const wrong = shuffle(
      pool.filter((w) => w.pt !== word.pt).map((w) => w.pt),
    ).slice(0, 2);
    return { kind: 'recognize', word, answer: word.pt, options: shuffle([word.pt, ...wrong]) };
  });
  const sentence: Step[] = lesson.words.map((word) => ({ kind: 'sentence', word }));
  const conversation: Step[] = lesson.conversation.map((turn, turnIndex) => ({
    kind: 'conversation',
    lesson,
    turn,
    turnIndex,
  }));
  return [...recognize, ...sentence, ...conversation];
}

export const PART_LABELS = {
  recognize: { n: 1, title: 'Reconhecer' },
  sentence: { n: 2, title: 'Frase curta' },
  conversation: { n: 3, title: 'Mini conversa' },
} as const;
