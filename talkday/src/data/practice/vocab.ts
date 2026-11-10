import type { VocabPack } from '@/domain/practice';

export const VOCAB_PACKS: VocabPack[] = [
  {
    id: 'vocab-1', title: 'Primeiras palavras do escritório', unlockAfter: 10,
    words: [
      { text: 'meeting', pt: 'reunião', example: 'I have a meeting today.', examplePt: 'Eu tenho uma reunião hoje.' },
      { text: 'email', pt: 'e-mail', example: 'I write an email.', examplePt: 'Eu escrevo um e-mail.' },
      { text: 'task', pt: 'tarefa', example: 'This task is easy.', examplePt: 'Esta tarefa é fácil.' },
      { text: 'team', pt: 'equipe', example: 'We are a good team.', examplePt: 'Nós somos uma boa equipe.' },
      { text: 'office', pt: 'escritório', example: 'The office is big.', examplePt: 'O escritório é grande.' },
      { text: 'report', pt: 'relatório', example: 'I read the report.', examplePt: 'Eu leio o relatório.' },
    ],
  },
  {
    id: 'vocab-2', title: 'No dia a dia do trabalho', unlockAfter: 25,
    words: [
      { text: 'desk', pt: 'mesa de trabalho', example: 'My desk is near the door.', examplePt: 'Minha mesa de trabalho fica perto da porta.' },
      { text: 'client', pt: 'cliente', example: 'The client is here.', examplePt: 'O cliente está aqui.' },
      { text: 'project', pt: 'projeto', example: 'This project is new.', examplePt: 'Este projeto é novo.' },
      { text: 'deadline', pt: 'prazo', example: 'The deadline is Friday.', examplePt: 'O prazo é sexta-feira.' },
      { text: 'manager', pt: 'gerente', example: 'My manager is kind.', examplePt: 'Meu gerente é gentil.' },
      { text: 'schedule', pt: 'agenda / horário', example: 'Check the schedule, please.', examplePt: 'Veja a agenda, por favor.' },
    ],
  },
  {
    id: 'vocab-3', title: 'Ferramentas e arquivos', unlockAfter: 45,
    words: [
      { text: 'document', pt: 'documento', example: 'I need this document.', examplePt: 'Eu preciso deste documento.' },
      { text: 'password', pt: 'senha', example: 'I forget my password.', examplePt: 'Eu esqueço minha senha.' },
      { text: 'screen', pt: 'tela', example: 'Look at my screen.', examplePt: 'Olhe a minha tela.' },
      { text: 'printer', pt: 'impressora', example: 'The printer is old.', examplePt: 'A impressora é velha.' },
      { text: 'folder', pt: 'pasta', example: 'The file is in this folder.', examplePt: 'O arquivo está nesta pasta.' },
      { text: 'link', pt: 'link', example: 'Send me the link.', examplePt: 'Me envie o link.' },
    ],
  },
  {
    id: 'vocab-4', title: 'Conversas de trabalho', unlockAfter: 70,
    words: [
      { text: 'presentation', pt: 'apresentação', example: 'I have a presentation tomorrow.', examplePt: 'Eu tenho uma apresentação amanhã.' },
      { text: 'budget', pt: 'orçamento', example: 'The budget is small.', examplePt: 'O orçamento é pequeno.' },
      { text: 'contract', pt: 'contrato', example: 'Read the contract, please.', examplePt: 'Leia o contrato, por favor.' },
      { text: 'interview', pt: 'entrevista', example: 'I have an interview on Monday.', examplePt: 'Eu tenho uma entrevista na segunda.' },
      { text: 'feedback', pt: 'retorno (feedback)', example: 'Thanks for your feedback.', examplePt: 'Obrigado pelo seu retorno.' },
      { text: 'colleague', pt: 'colega de trabalho', example: 'My colleague is kind.', examplePt: 'Meu colega de trabalho é gentil.' },
    ],
  },
];
