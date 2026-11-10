import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import { LESSONS } from '@/data/lessons';
import { randomError, randomSuccess } from '@/data/messages';
import { buildSteps } from '@/domain/steps';
import { FREE_DAILY_LIMIT, limitMessage } from '@/domain/plan';
import type { Level } from '@/domain/level';
import type { Accent, CheckResult, ConversationTurn, Issue, Lesson, Step } from '@/domain/types';
import { aiClient, mockClient } from '@/services/ai';
import { ApiError } from '@/services/auth';

export type Phase = 'answering' | 'checking' | 'correct' | 'wrong';

export interface Feedback {
  correct: boolean;
  message: string;
  corrected: string;
  explanationPt: string;
  reply?: { en: string; pt: string };
  /** A frase do aluno, como ele enviou. */
  original?: string;
  /** Problemas encontrados na frase inteira. */
  issues?: Issue[];
  /** Forma mais natural de dizer. */
  natural?: string;
  /** Aviso sobre o plano (ex.: limite diário atingido). */
  notice?: string;
}

export interface ExerciseOptions {
  /** Perguntas da mini conversa geradas pela IA (premium). Sem isso, usa as fixas da lição. */
  aiCoach: boolean;
  level: Level;
}

export const ATTEMPTS_BEFORE_LISTEN = 2;
export const ATTEMPTS_BEFORE_SKIP = 3;

function haptic(type: Haptics.NotificationFeedbackType) {
  Haptics.notificationAsync(type).catch(() => {});
}

function referenceFor(step: Step, turn: ConversationTurn | null): { reference: string; targets: string[]; tip: string; context?: string } {
  switch (step.kind) {
    case 'recognize':
      return { reference: step.answer, targets: [], tip: step.word.tip };
    case 'sentence':
      return { reference: step.word.example, targets: [step.word.text], tip: step.word.tip };
    case 'conversation':
      return {
        reference: (turn ?? step.turn).suggestion,
        targets: step.lesson.words.map((w) => w.text),
        tip: `Use pelo menos uma destas palavras: ${step.lesson.words.map((w) => `"${w.text}"`).join(', ')}.`,
        context: (turn ?? step.turn).coach,
      };
  }
}

export function useExercise(lesson: Lesson, accent: Accent, options: ExerciseOptions) {
  const { aiCoach, level } = options;
  const steps = useMemo(() => buildSteps(lesson, LESSONS.flatMap((l) => l.words)), [lesson]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('answering');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [missedWords, setMissedWords] = useState<Set<string>>(new Set());
  const [skipped, setSkipped] = useState(0);
  const [turn, setTurn] = useState<ConversationTurn | null>(null);
  // Pergunta de cada turno (promessa compartilhada para poder pré-carregar) e histórico enviado à IA.
  const turnPromises = useRef(new Map<number, Promise<ConversationTurn>>());
  const log = useRef<{ coach: string; student: string }[]>([]);
  const logged = useRef(new Set<number>());

  const step = steps[index] as Step | undefined;
  const finished = index >= steps.length;

  /** Pede a pergunta do turno à IA; em qualquer falha usa a pergunta fixa da lição. */
  const requestTurn = useCallback(
    (turnIndex: number, fallback: ConversationTurn): Promise<ConversationTurn> => {
      let p = turnPromises.current.get(turnIndex);
      if (!p) {
        const words = lesson.words.map((w) => w.text);
        p = (aiClient.nextCoachTurn && aiCoach
          ? aiClient.nextCoachTurn({ words, history: log.current.slice(-3), accent })
          : Promise.reject(new Error('sem IA'))
        ).catch(() => fallback);
        turnPromises.current.set(turnIndex, p);
      }
      return p;
    },
    [lesson, accent, aiCoach],
  );

  const recordTurn = useCallback((turnIndex: number, coach: string, student: string) => {
    if (logged.current.has(turnIndex)) return;
    logged.current.add(turnIndex);
    log.current.push({ coach, student });
  }, []);

  // Carrega a pergunta quando chega a mini conversa; antes disso, pré-carrega a primeira.
  useEffect(() => {
    if (!step) return;
    if (step.kind !== 'conversation') {
      setTurn(null);
      const first = steps.findIndex((s) => s.kind === 'conversation');
      const firstStep = steps[first];
      if (firstStep?.kind === 'conversation' && index >= first - 2) requestTurn(0, firstStep.turn);
      return;
    }
    let alive = true;
    setTurn(null);
    requestTurn(step.turnIndex, step.turn).then((t) => alive && setTurn(t));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, step]);

  const markMissed = useCallback((s: Step) => {
    if (s.kind === 'conversation') return;
    setMissedWords((prev) => new Set(prev).add(s.word.id));
  }, []);

  const submit = useCallback(
    async (answer: string) => {
      if (!step || phase === 'checking' || phase === 'correct') return;
      if (step.kind === 'conversation' && !turn) return;
      setPhase('checking');
      const ref = referenceFor(step, turn);
      let result: CheckResult;
      let notice: string | undefined;
      if (step.kind === 'recognize') {
        const ok = answer === step.answer;
        result = {
          correct: ok,
          corrected: `${step.word.text} = ${step.answer}`,
          explanationPt: ok ? '' : step.word.tip,
        };
      } else {
        const request = {
          mode: step.kind,
          level,
          accent,
          sentence: answer,
          targetWords: ref.targets,
          context: ref.context,
          reference: ref.reference,
          tip: ref.tip,
        };
        try {
          result = await aiClient.checkSentence(request);
        } catch (e) {
          if (e instanceof ApiError && e.code === 'daily_limit') {
            // Limite do plano grátis: segue com a correção básica (sem IA) e avisa.
            result = await mockClient.checkSentence(request);
            notice = `${limitMessage(e.limit ?? FREE_DAILY_LIMIT, e.resetsAt)} Esta correção foi básica (só confere a palavra). Assine o Premium para correção completa sem limite.`;
          } else {
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
      }
      if (result.correct) {
        haptic(Haptics.NotificationFeedbackType.Success);
        if (step.kind === 'conversation' && turn) {
          recordTurn(step.turnIndex, turn.coach, answer);
          // Já pede a próxima pergunta enquanto o aluno lê o feedback.
          const nextStep = steps[index + 1];
          if (nextStep?.kind === 'conversation') requestTurn(nextStep.turnIndex, nextStep.turn);
        }
        setFeedback({
          correct: true,
          message: randomSuccess(),
          corrected: result.corrected,
          explanationPt: '',
          reply: result.reply,
          original: step.kind === 'recognize' ? undefined : answer,
          issues: result.issues,
          natural: result.natural,
          notice,
        });
        setPhase('correct');
      } else {
        haptic(Haptics.NotificationFeedbackType.Warning);
        setAttempts((a) => a + 1);
        markMissed(step);
        setFeedback({
          correct: false,
          message: randomError(),
          corrected: result.corrected,
          explanationPt: result.explanationPt,
          original: step.kind === 'recognize' ? undefined : answer,
          issues: result.issues,
          natural: result.natural,
          notice,
        });
        setPhase('wrong');
      }
    },
    [step, phase, markMissed, accent, level, turn, steps, index, recordTurn, requestTurn],
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
    if (step?.kind === 'conversation' && turn) recordTurn(step.turnIndex, turn.coach, '');
    setSkipped((n) => n + 1);
    setIndex((i) => i + 1);
    setAttempts(0);
    setFeedback(null);
    setPhase('answering');
  }, [step, turn, recordTurn]);

  const restart = useCallback(() => {
    setIndex(0);
    setSkipped(0);
    setAttempts(0);
    setFeedback(null);
    setPhase('answering');
    setMissedWords(new Set());
    setTurn(null);
    turnPromises.current.clear();
    log.current = [];
    logged.current.clear();
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
    turn,
    canListenCorrect: attempts >= ATTEMPTS_BEFORE_LISTEN,
    canSkip: attempts >= ATTEMPTS_BEFORE_SKIP,
    submit,
    retry,
    next,
    skip,
    restart,
  };
}
