/** Variáveis EXPO_PUBLIC_* vão dentro do app e NÃO são secretas. */
export const PROXY_URL = process.env.EXPO_PUBLIC_AI_PROXY_URL?.replace(/\/+$/, '') || undefined;
/** Página de pagamento do upgrade (link de checkout). Vazio = assinatura ainda indisponível. */
export const UPGRADE_URL = process.env.EXPO_PUBLIC_UPGRADE_URL || undefined;
