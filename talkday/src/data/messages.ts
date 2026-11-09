export const SUCCESS_MESSAGES = [
  'Arrasou! 🎉 Até a rainha da Inglaterra aplaudiu.',
  'Boa! 🚀 Seu inglês acabou de subir de nível.',
  'Perfeito! 🌟 Isso foi dito como um nativo!',
  'Mandou bem! 🔥 Está pegando fogo hoje.',
  'Uau! 🦄 Raro, lindo e gramaticalmente correto.',
  'Nailed it! 🎯 Acertou em cheio.',
  'Show de bola! 🍕 Mereceu uma fatia de pizza.',
  'Isso aí! 💪 Seu cérebro está em modo turbo.',
  'Incrível! 🎸 Isso foi um solo de inglês.',
  'Genial! 🧠 Palavra aprendida, conquista desbloqueada.',
];

export const ERROR_MESSAGES = [
  'Quase lá! 💪 Errar faz parte de aprender.',
  'Uma voltinha a mais! 🌱 Você está pertinho.',
  'Sem stress! 🙂 Até nativos tropeçam às vezes.',
  'Boa tentativa! ✨ Vamos ajustar um detalhe.',
  'Calma, campeão(ã)! 🐢 Devagar a gente chega longe.',
  'Quase! 🍀 Cada erro é um passo para o acerto.',
];

let lastSuccess = -1;
let lastError = -1;

function pick(list: string[], last: number): number {
  let i = Math.floor(Math.random() * list.length);
  if (i === last) i = (i + 1) % list.length;
  return i;
}

export function randomSuccess(): string {
  lastSuccess = pick(SUCCESS_MESSAGES, lastSuccess);
  return SUCCESS_MESSAGES[lastSuccess];
}

export function randomError(): string {
  lastError = pick(ERROR_MESSAGES, lastError);
  return ERROR_MESSAGES[lastError];
}
