/** Palavra: [texto, tradução, exemplo en, exemplo pt, dica opcional]. */
export type RawWord = [text: string, pt: string, example: string, examplePt: string, tip?: string];
/** Turno do coach: [pergunta en, pergunta pt, resposta sugerida]. */
export type RawTurn = [coach: string, coachPt: string, suggestion: string];
export type RawLesson = [id: number, title: string, words: RawWord[], turns: RawTurn[]];
