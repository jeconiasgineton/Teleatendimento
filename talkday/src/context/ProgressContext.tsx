import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { LESSONS } from '@/data/lessons';
import {
  applyLessonResult,
  applyReviewResult,
  currentLessonId,
  initialProgress,
  lessonPassed,
  type LessonResult,
  type ProgressState,
} from '@/domain/progress';
import { applyPracticeResult } from '@/domain/practice';
import type { Lesson } from '@/domain/types';
import { KEYS, loadJSON, saveJSON } from '@/services/storage';

type Action =
  | { type: 'loaded'; state: ProgressState }
  | { type: 'lesson'; lesson: Lesson; result: LessonResult; now: number }
  | { type: 'review'; wordId: string; correct: boolean; now: number }
  | { type: 'practice'; packId: string; percent: number; now: number }
  | { type: 'reset'; now: number };

interface Store {
  state: ProgressState;
  loaded: boolean;
}

function reducer(store: Store, a: Action): Store {
  switch (a.type) {
    case 'loaded':
      return { state: a.state, loaded: true };
    case 'lesson':
      return { ...store, state: applyLessonResult(store.state, a.lesson, a.result, a.now) };
    case 'review':
      return { ...store, state: applyReviewResult(store.state, a.wordId, a.correct, a.now) };
    case 'practice':
      return { ...store, state: applyPracticeResult(store.state, a.packId, a.percent, a.now) };
    case 'reset':
      return { ...store, state: initialProgress(a.now) };
  }
}

function isProgress(x: unknown): x is ProgressState {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<ProgressState>;
  return (
    s.version === 1 &&
    typeof s.startedAt === 'number' &&
    typeof s.completed === 'object' && s.completed !== null &&
    Array.isArray(s.learned) &&
    typeof s.reviews === 'object' && s.reviews !== null
  );
}

interface ProgressApi {
  state: ProgressState;
  loaded: boolean;
  currentLesson: number | null;
  /** Registra o resultado; devolve true se a lição foi aprovada. */
  completeLesson: (lesson: Lesson, result: LessonResult) => boolean;
  gradeReview: (wordId: string, correct: boolean) => void;
  /** Registra o resultado (%) de um pacote da aba Praticar. */
  completePractice: (packId: string, percent: number) => void;
  reset: () => void;
}

const Ctx = createContext<ProgressApi | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [store, dispatch] = useReducer(reducer, { state: initialProgress(Date.now()), loaded: false });
  const hydrated = useRef(false);

  useEffect(() => {
    let alive = true;
    loadJSON(KEYS.progress, isProgress).then((saved) => {
      if (alive) dispatch({ type: 'loaded', state: saved ? { ...saved, practice: saved.practice ?? {} } : initialProgress(Date.now()) });
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!store.loaded) return;
    if (!hydrated.current) {
      hydrated.current = true;
      if (store.state.learned.length === 0 && Object.keys(store.state.completed).length === 0) {
        saveJSON(KEYS.progress, store.state); // fixa a data de início
      }
      return;
    }
    saveJSON(KEYS.progress, store.state);
  }, [store]);

  const completeLesson = useCallback((lesson: Lesson, result: LessonResult) => {
    const passed = lessonPassed(result);
    if (passed) dispatch({ type: 'lesson', lesson, result, now: Date.now() });
    return passed;
  }, []);
  const gradeReview = useCallback((wordId: string, correct: boolean) => dispatch({ type: 'review', wordId, correct, now: Date.now() }), []);
  const completePractice = useCallback((packId: string, percent: number) => dispatch({ type: 'practice', packId, percent, now: Date.now() }), []);
  const reset = useCallback(() => dispatch({ type: 'reset', now: Date.now() }), []);

  const value = useMemo<ProgressApi>(
    () => ({
      state: store.state,
      loaded: store.loaded,
      currentLesson: currentLessonId(store.state, LESSONS),
      completeLesson,
      gradeReview,
      completePractice,
      reset,
    }),
    [store, completeLesson, gradeReview, completePractice, reset],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProgress(): ProgressApi {
  const v = useContext(Ctx);
  if (!v) throw new Error('useProgress fora do ProgressProvider');
  return v;
}
