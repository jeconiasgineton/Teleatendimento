import { useCallback, useMemo, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LESSONS } from '@/data/lessons';
import { randomError, randomSuccess } from '@/data/messages';
import { buildSteps } from '@/domain/steps';
import type { Accent, CheckResult, Lesson, Step } from '@/domain/types';
import { aiClient } from '@/services/ai';

export type Phase = 'answering' | 'checking' | 'correct' | 'wrong';

export interface Feedback {
  correct: boolean;
  message: string;
  corrected: string;
  explanationPt: string;
  reply?: { en: string; pt: string };
}

export const ATTEMPTS_BEFORE_LISTEN = 2;
export const ATTEMPTS_BEFORE_SKIP = 3;

function haptic(type: Haptics.NotificationFeedbackType) {
  Haptics.notificationAsync(type).catch(() => {});
}

function referenceFor(step: Step): { reference: string; targets: string[]; tip: string; context?: string } {
  switch (step.kind) {
    case 'recognize':
      return { reference: step.answer, targets: [], tip: step.word.tip };
    case 'sentence':
      return { reference: step.word.example, targets: [step.word.text], tip: step.word.tip };
    case 'conversation':
      return {
        reference: step.turn.suggestion,
        targets: step.lesson.words.map((w) => w.text),
        tip: `Use pelo menos uma destas palavras: ${step.lesson.words.map((w) => `"${w.text}"`).join(', ')}.`,
        context: step.turn.coach,
      };
  }
}

export function useExercise(lesson: Lesson, accent: Accent) {
  const steps = useMemo(() => buildSteps(lesson, LESSONS.flatMap((l) => l.words)), [lesson]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [missedWords, setMissedWords] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState(0);

  const step = steps[index] as Step | undefined;
  const finished = index >= steps.length;

  const markMissed = useCallback((s: Step) => {
    if (s.kind === 'conversation') return;
    setMissedWords((prev) => new Set(prev).add(s.word.id));
  }, []);

  const submit = useCallback(
    async (answer: string) => {
      if (!step || phase === 'checking' || phase === 'correct') return;
      setPhase('checking');
      const ref = referenceFor(step);
      let result: CheckResult;
      if (step.kind === 'recognize') {
        const ok = answer === step.answer;
        result = {
          correct: ok,
          corrected: `${step.word.text} = ${step.answer}`,
          explanationPt: ok ? '' : step.word.tip,
        };
      } else {
        try {
          result = await aiClient.checkSentence({
            mode: step.kind,
            accent,
            sentence: answer,
            targetWords: ref.targets,
            context: ref.context,
            reference: ref.reference,
            tip: ref.tip,
          });
        } catch {
          setPhase('answering');
          setFeedback({
            correct: false,
            message: 'Ops, não consegui conferir agora. 📡',
            corrected: '',
            explanationPt: 'Verifique sua conexão e tente de novo.',
          });
          return;
        }
      }
      if (result.correct) {
        haptic(Haptics.NotificationFeedbackType.Success);
        setFeedback({ correct: true, message: randomSuccess(), corrected: result.corrected, explanationPt: '', reply: result.reply });
        setPhase('correct');
      } else {
        haptic(Haptics.NotificationFeedbackType.Warning);
        setAttempts((a) => a + 1);
        markMissed(step);
        setFeedback({ correct: false, message: randomError(), corrected: result.corrected, explanationPt: result.explanationPt });
        setPhase('wrong');
      }
    },
    [step, phase, markMissed, accent],
  );

  const retry = useCallback(() => {
    setFeedback(null);
    setPhase('answering');
  }, []);

  const next = useCallback(() => {
    setIndex((i) => i + 1);
    setAttempts(0);
    setFeedback(null);
    setPhase('answering');
  }, []);

  const skip = useCallback(() => {
    setSkipped((n) => n + 1);
    setIndex((i) => i + 1);
    setAttempts(0);
    setFeedback(null);
    setPhase('answering');
  }, []);

  const restart = useCallback(() => {
    setIndex(0);
    setSkipped(0);
    setAttempts(0);
    setFeedback(null);
    setPhase('answering');
    setMissedWords(new Set());
  }, []);

  return {
    steps,
    step,
    index,
    finished,
    phase,
    attempts,
    feedback,
    missedWords,
    skipped,
    canListenCorrect: attempts >= ATTEMPTS_BEFORE_LISTEN,
    canSkip: attempts >= ATTEMPTS_BEFORE_SKIP,
    submit,
    retry,
    next,
    skip,
    restart,
  };
}
