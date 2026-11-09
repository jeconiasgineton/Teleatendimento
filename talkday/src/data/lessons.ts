import { COURSE } from './course';
import type { Lesson } from '@/domain/types';

export const LESSONS: Lesson[] = COURSE;

export function getLesson(id: number): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

import type { Word } from '@/domain/types';

export const WORDS_BY_ID: Record<string, Word> = Object.fromEntries(
  LESSONS.flatMap((l) => l.words).map((w) => [w.id, w]),
);
