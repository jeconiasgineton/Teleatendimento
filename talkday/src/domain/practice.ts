import { makeBlank } from './review.ts';
import type { ProgressState } from './progress.ts';
import type { ConversationTurn } from './types.ts';

export type PracticeKind = 'vocab' | 'listen' | 'meeting';

/** Acertar pelo menos isto (%) conclui o pacote. */
export const PASS_PERCENT = 60;

export interface PackBase {
  id: string;
  title: string;
  /** Só abre depois de concluir esta lição do curso. */
  unlockAfter: number;
}

export interface PracticeWord {
  text: string;
  pt: string;
  example: string;
  examplePt: string;
}

export interface VocabPack extends PackBase {
  words: PracticeWord[];
}

export interface ListenPack extends PackBase {
  lines: { en: string; pt: string }[];
}

export interface MeetingPack extends PackBase {
  goalPt: string;
  /** Tema enviado à IA para gerar as perguntas. */
  topic: string;
  /** Palavras que a resposta pode usar (todas já aprendidas na lição que libera o pacote). */
  words: string[];
  /** Perguntas de reserva, usadas se a IA falhar. */
  turns: ConversationTurn[];
}

export interface ChoiceQuestion {
  id: string;
  heading: string;
  /** Texto grande mostrado ao aluno. Vazio = só áudio. */
  big?: string;
  small?: string;
  /** Frase falada automaticamente (e pelo botão de ouvir). */
  speak?: string;
  options: string[];
  answer: string;
  /** Frase em inglês mostrada/falada depois da resposta. */
  reveal: string;
  explanation: string;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const others = <T>(list: T[], skip: T, n: number): T[] => shuffle(list.filter((x) => x !== skip)).slice(0, n);

/** Duas rodadas: significado de cada palavra e completar a frase. */
export function buildVocabQuestions(pack: VocabPack): ChoiceQuestion[] {
  const meaning: ChoiceQuestion[] = shuffle(pack.words).map((w) => ({
    id: `${pack.id}:m:${w.text}`,
    heading: 'O que significa esta palavra?',
    big: w.text,
    speak: w.text,
    options: shuffle([w.pt, ...others(pack.words.map((x) => x.pt), w.pt, 2)]),
    answer: w.pt,
    reveal: w.example,
    explanation: `"${w.text}" significa "${w.pt}". Exemplo: ${w.example}`,
  }));
  const blank: ChoiceQuestion[] = shuffle(pack.words).map((w) => ({
    id: `${pack.id}:b:${w.text}`,
    heading: 'Complete a frase',
    big: makeBlank(w.example, w.text),
    small: w.examplePt,
    options: shuffle([w.text, ...others(pack.words.map((x) => x.text), w.text, 2)]),
    answer: w.text,
    reveal: w.example,
    explanation: `A frase completa é: ${w.example}`,
  }));
  return [...meaning, ...blank];
}

/** Ouve uma fala de reunião e escolhe o que ela significa. */
export function buildListenQuestions(pack: ListenPack): ChoiceQuestion[] {
  return shuffle(pack.lines).map((l) => ({
    id: `${pack.id}:${l.en}`,
    heading: 'O que a pessoa disse?',
    speak: l.en,
    options: shuffle([l.pt, ...others(pack.lines.map((x) => x.pt), l.pt, 2)]),
    answer: l.pt,
    reveal: l.en,
    explanation: `Ela disse: "${l.en}" (${l.pt})`,
  }));
}

export function packUnlocked(state: ProgressState, pack: PackBase): boolean {
  return Boolean(state.completed[pack.unlockAfter]);
}

export function packDone(state: ProgressState, pack: PackBase): boolean {
  return (state.practice[pack.id]?.best ?? 0) >= PASS_PERCENT;
}

export type PackStatus = 'locked' | 'available' | 'done';

/** `unlockAll` (usuário master) abre todos os pacotes para testes. */
export function packStatus(state: ProgressState, pack: PackBase, unlockAll = false): PackStatus {
  if (!unlockAll && !packUnlocked(state, pack)) return 'locked';
  return packDone(state, pack) ? 'done' : 'available';
}

export function applyPracticeResult(state: ProgressState, packId: string, percent: number, now: number): ProgressState {
  const prev = state.practice[packId];
  const best = Math.max(prev?.best ?? 0, Math.max(0, Math.min(100, Math.round(percent))));
  return { ...state, practice: { ...state.practice, [packId]: { best, at: now } } };
}
