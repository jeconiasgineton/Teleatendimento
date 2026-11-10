/** Planos e o que cada um libera. Regras puras: o servidor é quem realmente impõe. */
export type Plan = 'free' | 'premium' | 'master';

/** Correções por dia no plano free (igual ao servidor). */
export const FREE_DAILY_LIMIT = 30;
/** Renova o token quando faltar menos que isto para vencer. */
export const RENEW_BEFORE_MS = 3 * 24 * 3600_000;

export type Feature =
  | 'free-talk' // Conversa livre com a Sam
  | 'meeting' // Falando nas reuniões
  | 'ai-coach' // Perguntas da mini conversa geradas pela IA
  | 'unlimited-correction' // Correção completa sem limite diário
  | 'unlock-all'; // Libera todas as lições e pacotes (só para testes)

const FEATURES: Record<Plan, ReadonlySet<Feature>> = {
  free: new Set(),
  premium: new Set<Feature>(['free-talk', 'meeting', 'ai-coach', 'unlimited-correction']),
  master: new Set<Feature>(['free-talk', 'meeting', 'ai-coach', 'unlimited-correction', 'unlock-all']),
};

export function can(plan: Plan, feature: Feature): boolean {
  return FEATURES[plan].has(feature);
}

export const PLAN_LABEL: Record<Plan, string> = { free: 'Grátis', premium: 'Premium', master: 'Master' };

export function shouldRenew(expiresAt: number | null, now: number): boolean {
  return expiresAt !== null && expiresAt - now < RENEW_BEFORE_MS;
}

/** Mensagem do limite diário atingido (com a hora em que zera). */
export function limitMessage(limit: number, resetsAt?: number): string {
  const when = resetsAt
    ? ` Volta amanhã às ${new Date(resetsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`
    : '';
  return `Você usou as ${limit} correções por IA de hoje no plano Grátis.${when}`;
}
