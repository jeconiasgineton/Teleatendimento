import { useCallback, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { randomError, randomSuccess } from '@/data/messages';
import type { ReviewQuestion } from '@/domain/review';
import type { Feedback } from '@/hooks/useExercise';

interface Options {
  questions: ReviewQuestion[];
  /** Avalia a resposta; devolve true se estiver correta. */
  grade: (q: ReviewQuestion, answer: string | string[]) => boolean;
  /** Registra na revisão espaçada (uma vez por palavra, na 1ª resposta). */
  onGraded: (wordId: string, correct: boolean) => void;
  reference: (q: ReviewQuestion) => string;
}

/**
 * Sessão de revisão: cada palavra é registrada na revisão espaçada só na primeira
 * resposta. Errou? A pergunta volta uma vez no fim da fila para reforçar.
 */
export function useReviewSession({ questions, grade, onGraded, reference }: Options) {
  const [queue, setQueue] = useState<ReviewQuestion[]>(questions);
  const [index, setIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [correctFirst, setCorrectFirst] = useState(0);
  const graded = useRef(new Set<string>());
  const requeued = useRef(new Set<string>());

  const question = queue[index] as ReviewQuestion | undefined;
  const finished = index >= queue.length;
  const total = useMemo(() => questions.length, [questions]);

  const answer = useCallback(
    (value: string | string[]) => {
      if (!question || feedback) return;
      const ok = grade(question, value);
      const first = !graded.current.has(question.wordId);
      if (first) {
        graded.current.add(question.wordId);
        onGraded(question.wordId, ok);
        if (ok) setCorrectFirst((n) => n + 1);
      }
      Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      if (ok) {
        setFeedback({ correct: true, message: randomSuccess(), corrected: reference(question), explanationPt: '' });
      } else {
        if (!requeued.current.has(question.wordId)) {
          requeued.current.add(question.wordId);
          setQueue((q) => [...q, question]);
        }
        setFeedback({ correct: false, message: randomError(), corrected: reference(question), explanationPt: question.word.tip });
      }
    },
    [question, feedback, grade, onGraded, reference],
  );

  const next = useCallback(() => {
    setFeedback(null);
    setIndex((i) => i + 1);
  }, []);

  return { question, index, queueLength: queue.length, total, finished, feedback, correctFirst, answer, next };
}
