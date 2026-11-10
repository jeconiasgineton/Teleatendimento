import type { MeetingPack } from '@/domain/practice';

export const MEETING_PACKS: MeetingPack[] = [
  {
    id: 'meeting-1', title: 'Apresentando-se', unlockAfter: 12,
    goalPt: 'Diga quem você é e do que gosta.',
    topic: 'introducing yourself to new teammates in a first team meeting',
    words: ['I', 'am', 'my', 'we', 'have', 'like', 'love', 'need', 'hello', 'friend'],
    turns: [
      { coach: 'Hello! Who are you?', coachPt: 'Olá! Quem é você?', suggestion: 'I am Ana.' },
      { coach: 'What do you like?', coachPt: 'Do que você gosta?', suggestion: 'I like coffee.' },
      { coach: 'Do you have a friend here?', coachPt: 'Você tem um amigo aqui?', suggestion: 'Yes, I have a friend.' },
    ],
  },
  {
    id: 'meeting-2', title: 'Pedindo ajuda', unlockAfter: 38,
    goalPt: 'Peça ajuda a um colega de forma educada.',
    topic: 'asking a coworker for help with a small task',
    words: ['help', 'need', 'can', 'please', 'try', 'use', 'find', 'me', 'you', 'my'],
    turns: [
      { coach: 'What do you need?', coachPt: 'Do que você precisa?', suggestion: 'I need help, please.' },
      { coach: 'Can you use this phone?', coachPt: 'Você consegue usar este telefone?', suggestion: 'Yes, I can use it.' },
      { coach: 'Can I help you?', coachPt: 'Posso ajudar você?', suggestion: 'Yes, please help me.' },
    ],
  },
  {
    id: 'meeting-3', title: 'Atualização do trabalho', unlockAfter: 50,
    goalPt: 'Conte o que você faz hoje e amanhã.',
    topic: 'giving a short work update to the team',
    words: ['work', 'today', 'tomorrow', 'start', 'stop', 'wait', 'make', 'take', 'because', 'but'],
    turns: [
      { coach: 'What do you do today?', coachPt: 'O que você faz hoje?', suggestion: 'I work on a report today.' },
      { coach: 'What do you do tomorrow?', coachPt: 'O que você faz amanhã?', suggestion: 'I start a new task tomorrow.' },
      { coach: 'Do you need more time?', coachPt: 'Você precisa de mais tempo?', suggestion: 'Yes, because it is hard.' },
    ],
  },
  {
    id: 'meeting-4', title: 'Marcando um horário', unlockAfter: 63,
    goalPt: 'Combine o dia e a hora da próxima reunião.',
    topic: 'scheduling a time for the next team meeting',
    words: ['time', 'hour', 'minute', 'early', 'late', 'soon', 'Monday', 'Friday', 'tomorrow', 'morning'],
    turns: [
      { coach: 'What time is good for you?', coachPt: 'Que horas são boas para você?', suggestion: 'Nine in the morning is good.' },
      { coach: 'Is Monday good?', coachPt: 'Segunda-feira é bom?', suggestion: 'Yes, Monday is good.' },
      { coach: 'Are you early or late?', coachPt: 'Você está adiantado ou atrasado?', suggestion: 'I am early.' },
    ],
  },
];
