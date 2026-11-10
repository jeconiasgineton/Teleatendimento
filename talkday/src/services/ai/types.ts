import type { CheckRequest, CheckResult, CoachRequest, ConversationTurn } from '@/domain/types';

export interface AIClient {
  checkSentence(req: CheckRequest): Promise<CheckResult>;
  /** Gera a próxima pergunta do coach. Ausente = usar as perguntas fixas da lição. */
  nextCoachTurn?(req: CoachRequest): Promise<ConversationTurn>;
}
