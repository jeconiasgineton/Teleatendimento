import { mockClient } from './mockClient';
import { createRemoteClient } from './remoteClient';
import type { AIClient } from './types';

const proxyUrl = process.env.EXPO_PUBLIC_AI_PROXY_URL;
// Atenção: variáveis EXPO_PUBLIC_* vão dentro do app e NÃO são secretas.
// O token só barra uso casual; a chave do Gemini fica apenas no Worker.
const appToken = process.env.EXPO_PUBLIC_APP_TOKEN;

/** Sem URL do proxy configurada, usa o corretor local (modo desenvolvimento). */
export const aiClient: AIClient = proxyUrl ? createRemoteClient(proxyUrl, appToken) : mockClient;
export const usingRealAI = Boolean(proxyUrl);
export type { AIClient };
