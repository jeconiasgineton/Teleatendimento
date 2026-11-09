import type { Lesson } from '@/domain/types';

/**
 * Conteúdo inicial (Fase 2). A lista completa de ~90 lições entra na Fase 4.
 * Lição 1 = 5 palavras básicas; as seguintes acrescentam de 3 a 5.
 */
export const LESSONS: Lesson[] = [
  {
    id: 1,
    title: 'Primeiras palavras',
    words: [
      { id: 'i', text: 'I', pt: 'eu', example: 'I am happy.', examplePt: 'Eu estou feliz.', tip: '"I" significa "eu" e é sempre escrito com letra maiúscula.' },
      { id: 'you', text: 'you', pt: 'você', example: 'You are my friend.', examplePt: 'Você é meu amigo.', tip: '"You" serve para "você" e para "vocês".' },
      { id: 'is', text: 'is', pt: 'é / está', example: 'She is at home.', examplePt: 'Ela está em casa.', tip: '"Is" liga ele, ela ou algo (he, she, it) a uma descrição ou lugar.' },
      { id: 'to', text: 'to', pt: 'para / a', example: 'I go to work.', examplePt: 'Eu vou para o trabalho.', tip: '"To" indica direção ou aparece antes de um verbo, como em "to eat".' },
      { id: 'the', text: 'the', pt: 'o / a (artigo)', example: 'The book is here.', examplePt: 'O livro está aqui.', tip: '"The" é o artigo definido: vale para "o", "a", "os" e "as".' },
    ],
    conversation: [
      { coach: 'Hi! Who are you?', coachPt: 'Oi! Quem é você?', suggestion: 'I am Ana.' },
      { coach: 'Where do you go?', coachPt: 'Para onde você vai?', suggestion: 'I go to the park.' },
    ],
  },
  {
    id: 2,
    title: 'Quem e o quê',
    words: [
      { id: 'he', text: 'he', pt: 'ele', example: 'He is tall.', examplePt: 'Ele é alto.', tip: '"He" é usado para um homem ou menino.' },
      { id: 'she', text: 'she', pt: 'ela', example: 'She is my sister.', examplePt: 'Ela é minha irmã.', tip: '"She" é usado para uma mulher ou menina.' },
      { id: 'it', text: 'it', pt: 'isso / ele / ela (coisa)', example: 'It is big.', examplePt: 'Isso é grande.', tip: '"It" substitui coisas, animais e situações.' },
      { id: 'a', text: 'a', pt: 'um / uma', example: 'I have a dog.', examplePt: 'Eu tenho um cachorro.', tip: '"A" é o artigo indefinido e vem antes de consoantes ("a dog").' },
    ],
    conversation: [
      { coach: 'What is it?', coachPt: 'O que é isso?', suggestion: 'It is a book.' },
      { coach: 'Who is she?', coachPt: 'Quem é ela?', suggestion: 'She is my friend.' },
    ],
  },
  {
    id: 3,
    title: 'Ter, querer, e',
    words: [
      { id: 'and', text: 'and', pt: 'e', example: 'I like tea and cake.', examplePt: 'Eu gosto de chá e bolo.', tip: '"And" junta duas palavras ou frases, como o "e" em português.' },
      { id: 'have', text: 'have', pt: 'ter', example: 'I have a car.', examplePt: 'Eu tenho um carro.', tip: '"Have" é usado com I, you, we e they; com he, she e it vira "has".' },
      { id: 'want', text: 'want', pt: 'querer', example: 'I want water.', examplePt: 'Eu quero água.', tip: '"Want" expressa desejo e vem logo depois do sujeito.' },
      { id: 'my', text: 'my', pt: 'meu / minha', example: 'This is my phone.', examplePt: 'Este é o meu celular.', tip: '"My" mostra que algo pertence a você e vem antes do substantivo.' },
      { id: 'not', text: 'not', pt: 'não', example: 'It is not here.', examplePt: 'Não está aqui.', tip: '"Not" nega o verbo e vem depois de "is", "am" ou "are".' },
    ],
    conversation: [
      { coach: 'What do you want?', coachPt: 'O que você quer?', suggestion: 'I want water and food.' },
      { coach: 'Do you have a phone?', coachPt: 'Você tem um celular?', suggestion: 'I have my phone.' },
    ],
  },
];

export function getLesson(id: number): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}
