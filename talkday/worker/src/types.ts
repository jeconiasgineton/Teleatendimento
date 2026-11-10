export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
  /** Opcional: se definido, o app precisa enviar o mesmo valor em X-App-Token. */
  APP_TOKEN?: string;
}

export interface CheckRequest {
  mode: 'sentence' | 'conversation';
  sentence: string;
  targetWords: string[];
  context?: string;
  accent: 'en-US' | 'en-GB';
}

export interface CheckResult {
  correct: boolean;
  corrected: string;
  explanationPt: string;
  /** Só na mini conversa: resposta curta do coach quando o aluno acerta. */
  reply?: { en: string; pt: string };
}

export interface CoachRequest {
  /** Palavras da lição que a pergunta deve incentivar. */
  words: string[];
  /** Turnos anteriores da conversa (mais antigos primeiro). */
  history: { coach: string; student: string }[];
  accent: 'en-US' | 'en-GB';
  /** Tema da conversa (ex.: reunião de trabalho). Opcional. */
  topic?: string;
}

export interface CoachResult {
  coach: string;
  coachPt: string;
  /** Resposta-modelo (usa ao menos uma das palavras da lição). */
  suggestion: string;
}
