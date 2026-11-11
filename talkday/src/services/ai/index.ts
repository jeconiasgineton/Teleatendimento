import { PROXY_URL } from '../config';
import { mockClient } from './mockClient';
import { createRemoteClient } from './remoteClient';
import type { AIClient } from './types';

/** Sem URL do proxy configurada, usa o corretor local (modo desenvolvimento). */
export const aiClient: AIClient = PROXY_URL ? createRemoteClient(PROXY_URL) : mockClient;
export const usingRealAI = Boolean(PROXY_URL);
export { mockClient };
export type { AIClient };
