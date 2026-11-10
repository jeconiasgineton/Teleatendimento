import type { Word } from './types.ts';

export type ReviewKind = 'complete' | 'translate';

export const BLANK = '_____';

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Troca a primeira ocorrência da palavra (inteira) por uma lacuna. */
export function makeBlank(example: string, word: string): string {
  const re = new RegExp(`(^|[^A-Za-z'])(${escape(word)})(?![A-Za-z'])`, 'i');
  return example.replace(re, (_m, pre) => `${pre}${BLANK}`);
}

/** Aceita a palavra sozinha ou dentro de uma frase falada. */
export function checkComplete(answer: string, word: string): boolean {
  const a = norm(answer);
  const w = norm(word);
  if (!a) return false;
  return a === w || ` ${a} `.includes(` ${w} `);
}

export function sentenceTokens(sentence: string): string[] {
  return sentence.trim().split(/\s+/).filter(Boolean);
}

export function checkTranslate(chosen: string[], example: string): boolean {
  return norm(chosen.join(' ')) === norm(example);
}

export function pickKind(box: number, lapses: number): ReviewKind {
  return (box + lapses) % 2 === 0 ? 'complete' : 'translate';
}

export interface ReviewQuestion {
  wordId: string;
  word: Word;
  kind: ReviewKind;
}
