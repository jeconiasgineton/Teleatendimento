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

export interface ChatTurn {
  role: 'ai' | 'user';
  text: string;
}

export interface ChatRequest {
  /** Conversa até agora (mais antigos primeiro). Vazio + sem userText = abrir a conversa. */
  history: ChatTurn[];
  /** Última fala do aluno, ainda fora do histórico. */
  userText?: string;
  /** Confiança do reconhecimento de voz (0 a 1), se houver. */
  confidence?: number;
  /** O aluno ficou em silêncio. */
  silence?: boolean;
  /** Idioma em que o app estava escutando. */
  listenedAs?: 'en' | 'pt';
  /** Palavras que o aluno já aprendeu (para o vocabulário da conversa). */
  words: string[];
  accent: 'en-US' | 'en-GB';
}

export interface ChatSegment {
  lang: 'en' | 'pt';
  text: string;
}

export interface ChatResult {
  /** O que a IA vai falar, em ordem; cada trecho usa a voz do seu idioma. */
  segments: ChatSegment[];
  /** Idioma em que o app deve escutar a próxima resposta. */
  nextListen: 'en' | 'pt';
  /** A conversa terminou (o aluno se despediu ou pediu para parar). */
  end: boolean;
}
