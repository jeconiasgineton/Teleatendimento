/** Tipos e regras puras da conversa livre por voz. */

export type ChatLang = 'en' | 'pt';

export interface ChatTurn {
  role: 'ai' | 'user';
  text: string;
}

export interface ChatSegment {
  lang: ChatLang;
  text: string;
}

export interface ChatResult {
  segments: ChatSegment[];
  /** Idioma em que o app escuta a próxima fala do aluno. */
  nextListen: ChatLang;
  end: boolean;
}

export interface ChatRequest {
  history: ChatTurn[];
  userText?: string;
  confidence?: number;
  silence?: boolean;
  listenedAs?: ChatLang;
  words: string[];
  accent: 'en-US' | 'en-GB';
}

/** O servidor aceita até 12 turnos; mandamos menos para a resposta ser rápida. */
export const MAX_HISTORY_TURNS = 10;
export const MAX_WORDS = 40;
/** Falhas seguidas (rede/IA/microfone) antes de encerrar a conversa. */
export const MAX_FAILURES = 3;

export function trimHistory(history: ChatTurn[], max = MAX_HISTORY_TURNS): ChatTurn[] {
  return history.slice(-max);
}

export function joinSegments(segments: ChatSegment[]): string {
  return segments.map((s) => s.text).join(' ');
}

export type SilenceAction = 'relisten' | 'nudge' | 'end';

/**
 * O que fazer depois de N janelas seguidas sem fala:
 * 1ª: ouve de novo em silêncio; 2ª: a IA pergunta se o aluno está aí;
 * 3ª: ouve de novo; 4ª: encerra por inatividade.
 */
export function silenceAction(consecutive: number): SilenceAction {
  if (consecutive <= 1) return 'relisten';
  if (consecutive === 2) return 'nudge';
  if (consecutive === 3) return 'relisten';
  return 'end';
}

const STOP = /^\s*(tchau|goodbye|good bye|bye|stop|parar|pare|encerrar|encerra|chega|fim)\b[\s.!?]*$/i;

/** Despedida curta dita sozinha; usada só se a IA estiver fora do ar. */
export function isStopPhrase(text: string): boolean {
  return STOP.test(text);
}

/** Últimas palavras aprendidas (as mais recentes pesam mais na conversa). */
export function recentWords(learnedIds: string[], byId: Record<string, { text: string }>, max = MAX_WORDS): string[] {
  return learnedIds
    .slice(-max)
    .map((id) => byId[id]?.text)
    .filter((t): t is string => Boolean(t));
}

/** Resposta de emergência quando a IA falha: pede para repetir, nos dois idiomas. */
export function fallbackReply(): ChatResult {
  return {
    segments: [
      { lang: 'en', text: 'Sorry, I had a problem. Can you say that again?' },
      { lang: 'pt', text: 'Desculpe, tive um problema. Pode repetir?' },
    ],
    nextListen: 'en',
    end: false,
  };
}

export function goodbyeReply(): ChatResult {
  return {
    segments: [
      { lang: 'en', text: 'It was nice to talk with you. See you soon!' },
      { lang: 'pt', text: 'Foi ótimo conversar com você. Até logo!' },
    ],
    nextListen: 'en',
    end: true,
  };
}
