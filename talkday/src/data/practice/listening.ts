import type { ListenPack } from '@/domain/practice';

export const LISTEN_PACKS: ListenPack[] = [
  {
    id: 'listen-1', title: 'Começando a reunião', unlockAfter: 15,
    lines: [
      { en: 'Good morning, everyone.', pt: 'Bom dia, pessoal.' },
      { en: 'Can you hear me?', pt: 'Vocês conseguem me ouvir?' },
      { en: 'The meeting starts at nine.', pt: 'A reunião começa às nove.' },
      { en: 'Please open the file.', pt: 'Por favor, abra o arquivo.' },
      { en: 'I have a question.', pt: 'Eu tenho uma pergunta.' },
      { en: 'Thank you, everyone.', pt: 'Obrigado, pessoal.' },
    ],
  },
  {
    id: 'listen-2', title: 'Tarefas e prazos', unlockAfter: 35,
    lines: [
      { en: 'Let us start now.', pt: 'Vamos começar agora.' },
      { en: 'Who has the report?', pt: 'Quem está com o relatório?' },
      { en: 'I will send the email today.', pt: 'Eu vou enviar o e-mail hoje.' },
      { en: 'Can you share your screen?', pt: 'Você pode compartilhar sua tela?' },
      { en: 'We need more time.', pt: 'Nós precisamos de mais tempo.' },
      { en: 'The deadline is on Friday.', pt: 'O prazo é na sexta-feira.' },
    ],
  },
  {
    id: 'listen-3', title: 'Pedir e combinar', unlockAfter: 60,
    lines: [
      { en: 'Can you say it again, please?', pt: 'Você pode repetir, por favor?' },
      { en: 'I do not understand this part.', pt: 'Eu não entendo esta parte.' },
      { en: 'Who can help with this problem?', pt: 'Quem pode ajudar com este problema?' },
      { en: 'We will finish this on Friday.', pt: 'Nós vamos terminar isso na sexta.' },
      { en: 'That is a good idea.', pt: 'Essa é uma boa ideia.' },
      { en: 'Send me a message after the meeting.', pt: 'Me mande uma mensagem depois da reunião.' },
    ],
  },
];
