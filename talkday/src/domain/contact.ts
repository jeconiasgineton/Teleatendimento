/** Mesmas regras do servidor (ele confere de novo); aqui só para avisar o aluno antes de enviar. */

export function normalizeEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (e.length < 5 || e.length > 120) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) ? e : null;
}

/** Só dígitos. Sem "+" assume Brasil (DDD + número); com "+" é internacional. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  let d = trimmed.replace(/\D/g, '');
  if (!trimmed.startsWith('+')) {
    d = d.replace(/^0+/, '');
    if (d.length === 10 || d.length === 11) d = `55${d}`;
  }
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export function passwordProblem(password: string, email: string): string | null {
  if (password.length < PASSWORD_MIN) return `A senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (password.length > PASSWORD_MAX) return `A senha pode ter no máximo ${PASSWORD_MAX} caracteres.`;
  if (password.toLowerCase() === email.trim().toLowerCase() || /^(.)\1+$/.test(password)) return 'Escolha uma senha menos óbvia.';
  return null;
}
