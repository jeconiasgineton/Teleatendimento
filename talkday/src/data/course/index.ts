import type { Lesson, Word } from '@/domain/types';
import { PART1 } from './part1.ts';
import { PART2 } from './part2.ts';
import type { RawLesson } from './types';

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function buildLesson([id, title, words, turns]: RawLesson): Lesson {
  return {
    id,
    title,
    words: words.map(([text, pt, example, examplePt, tip]): Word => ({
      id: slug(text),
      text,
      pt,
      example,
      examplePt,
      tip: tip ?? `"${text}" significa "${pt}". Exemplo: ${example}`,
    })),
    conversation: turns.map(([coach, coachPt, suggestion]) => ({ coach, coachPt, suggestion })),
  };
}

export const COURSE: Lesson[] = [...PART1, ...PART2].map(buildLesson);
