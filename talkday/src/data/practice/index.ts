import type { PackBase, PracticeKind } from '@/domain/practice';
import { LISTEN_PACKS } from './listening.ts';
import { MEETING_PACKS } from './meetings.ts';
import { VOCAB_PACKS } from './vocab.ts';

export interface PracticeInfo {
  kind: PracticeKind;
  title: string;
  subtitle: string;
  description: string;
  packs: PackBase[];
}

export const PRACTICES: PracticeInfo[] = [
  {
    kind: 'vocab',
    title: 'Vocabulário de trabalho',
    subtitle: 'Encontre as palavras certas',
    description: 'Pratique palavras básicas para falar sobre tarefas e atividades profissionais.',
    packs: VOCAB_PACKS,
  },
  {
    kind: 'listen',
    title: 'Entendendo a conversa',
    subtitle: 'Acompanhe o que os outros dizem',
    description: 'Treine expressões comuns para compreender falas simples em reuniões de trabalho.',
    packs: LISTEN_PACKS,
  },
  {
    kind: 'meeting',
    title: 'Falando nas reuniões',
    subtitle: 'Expresse suas ideias com confiança',
    description: 'Pratique respostas curtas para participar de conversas em grupo.',
    packs: MEETING_PACKS,
  },
];

export const getPractice = (kind: string): PracticeInfo | undefined => PRACTICES.find((p) => p.kind === kind);

export { LISTEN_PACKS, MEETING_PACKS, VOCAB_PACKS };
