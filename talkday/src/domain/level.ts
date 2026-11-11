export type Level = 'A1' | 'A2' | 'B1';

/** Nível aproximado do aluno, pelo ponto do curso (1 a 90 lições). */
export function levelForLesson(lessonId: number): Level {
  if (lessonId <= 40) return 'A1';
  if (lessonId <= 70) return 'A2';
  return 'B1';
}

/** Maior lição já concluída (ou a atual, se ainda não concluiu nenhuma). */
export function levelFromProgress(completed: Record<number, unknown>): Level {
  const ids = Object.keys(completed).map(Number).filter((n) => Number.isFinite(n));
  return levelForLesson(ids.length ? Math.max(...ids) : 1);
}
