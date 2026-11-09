import type { CheckRequest, CheckResult } from '@/domain/types';
import type { AIClient } from './types';

function tokens(s: string): string[] {
  return s.toLowerCase().match(/[a-z']+/g) ?? [];
}

function tidy(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  if (!t) return t;
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

/**
 * Corretor LOCAL provisório (Fase 2). Só confere se a frase usa a palavra-alvo
 * e tem tamanho mínimo; NÃO valida gramática. A correção real via Gemini
 * (proxy no Cloudflare Workers) substitui isto na Fase 3.
 */
export const mockClient: AIClient = {
  async checkSentence(req: CheckRequest): Promise<CheckResult> {
    await new Promise((r) => setTimeout(r, 350));
    const words = tokens(req.sentence);
    const targets = req.targetWords.map((w) => w.toLowerCase());

    if (words.length === 0) {
      return { correct: false, corrected: req.reference, explanationPt: 'Escreva ou fale uma frase em inglês para eu poder conferir.' };
    }
    if (!words.some((w) => targets.includes(w))) {
      const list = req.targetWords.map((w) => `"${w}"`).join(' ou ');
      return { correct: false, corrected: req.reference, explanationPt: `Use ${list} na sua frase. ${req.tip}` };
    }
    if (words.length < 2) {
      return { correct: false, corrected: req.reference, explanationPt: `Faça uma frase com pelo menos duas palavras. ${req.tip}` };
    }
    return { correct: true, corrected: tidy(req.sentence), explanationPt: '' };
  },
};
