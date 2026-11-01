// Nome de sala: 3 a 40 caracteres, minúsculas, números e hífen.
export const SALA_REGEX = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

export function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
