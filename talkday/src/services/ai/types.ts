import type { CheckRequest, CheckResult } from '@/domain/types';

export interface AIClient {
  checkSentence(req: CheckRequest): Promise<CheckResult>;
}
