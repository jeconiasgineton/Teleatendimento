export type Accent = 'en-US' | 'en-GB';

export interface Word {
  id: string;
  text: string;
  /** Tradução em português. */
  pt: string;
  /** Frase de exemplo em inglês, curta. */
  example: string;
  examplePt: string;
  /** Dica de uso em UMA frase (pt-BR). Usada na explicação de erros. */
  tip: string;
}

export interface ConversationTurn {
  coach: string;
  coachPt: string;
  /** Resposta sugerida (mostrada como forma correta se o aluno errar). */
  suggestion: string;
}

export interface Lesson {
  id: number;
  title: string;
  words: Word[];
  conversation: ConversationTurn[];
}

export type StepKind = 'recognize' | 'sentence' | 'conversation';

export type Step =
  | { kind: 'recognize'; word: Word; options: string[]; answer: string }
  | { kind: 'sentence'; word: Word }
  | { kind: 'conversation'; lesson: Lesson; turn: ConversationTurn; turnIndex: number };

export interface CheckRequest {
  mode: 'sentence' | 'conversation';
  accent: Accent;
  sentence: string;
  /** Palavras que a frase deve conter (ao menos uma). */
  targetWords: string[];
  /** Pergunta do coach, quando for conversa. */
  context?: string;
  /** Frase de referência usada como "forma correta" quando o aluno erra. */
  reference: string;
  /** Dica de uso em pt-BR, usada pelo corretor local. */
  tip: string;
}

export interface CoachRequest {
  words: string[];
  history: { coach: string; student: string }[];
  accent: Accent;
}

export interface CheckResult {
  correct: boolean;
  /** Forma correta em inglês. */
  corrected: string;
  /** Explicação em UMA frase (pt-BR). */
  explanationPt: string;
  /** Só na mini conversa: reação curta do coach ao acerto. */
  reply?: { en: string; pt: string };
}
