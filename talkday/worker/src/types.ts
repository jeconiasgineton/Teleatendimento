export type Plan = 'free' | 'premium' | 'master';
export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Contador diário por chave (Durable Object). Opcional: sem ele não há limite no servidor. */
export interface UsageNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

export interface Env {
  GEMINI_API_KEY: string;
  GEMINI_MODEL?: string;
  /** Segredo que assina tokens e códigos premium. */
  AUTH_SECRET?: string;
  /** Código do usuário master (libera tudo). */
  MASTER_CODE?: string;
  /** Ids de códigos premium revogados, separados por vírgula. */
  REVOKED_IDS?: string;
  USAGE?: UsageNamespace;
}

/** Correções por dia no plano free. */
export const FREE_DAILY_LIMIT = 30;

export interface CheckRequest {
  /** Nível do aluno; ajusta a profundidade da análise. */
  level?: Level;
  mode: 'sentence' | 'conversation';
  sentence: string;
  targetWords: string[];
  context?: string;
  accent: 'en-US' | 'en-GB';
}

export type IssueType = 'grammar' | 'word-choice' | 'context' | 'spelling' | 'naturalness' | 'missing-target';

export interface Issue {
  type: IssueType;
  /** Trecho do aluno com o problema. */
  original: string;
  /** Como ficaria corrigido. */
  fix: string;
  /** Explicação curta em português. */
  explanationPt: string;
}

export interface CheckResult {
  correct: boolean;
  corrected: string;
  explanationPt: string;
  /** Todos os problemas encontrados na frase inteira (máx. 4). */
  issues?: Issue[];
  /** Forma mais natural de dizer a mesma coisa, quando houver. */
  natural?: string;
  /** Uso do dia (só no plano free). */
  usage?: { used: number; limit: number };
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
