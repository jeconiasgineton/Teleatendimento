import { mockClient } from './mockClient';
import type { AIClient } from './types';

/** Fase 3 troca este cliente por um que chama o proxy do Gemini. */
export const aiClient: AIClient = mockClient;
export type { AIClient };
