import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ExerciseScreen } from '@/components/ExerciseScreen';
import { useEntitlement } from '@/context/EntitlementContext';
import { useProgress } from '@/context/ProgressContext';
import { getLesson } from '@/data/lessons';
import { lessonStatus } from '@/domain/progress';
import { LESSONS } from '@/data/lessons';

/** Refazer uma lição já concluída (lições bloqueadas não abrem). */
export default function LessonRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state, completeLesson } = useProgress();
  const { can } = useEntitlement();
  const lesson = getLesson(Number(id));

  if (!lesson || (lessonStatus(state, lesson.id, LESSONS) === 'locked' && !can('unlock-all'))) return <Redirect href="/progress" />;

  return (
    <ExerciseScreen
      key={lesson.id}
      lesson={lesson}
      nextLabel="Voltar"
      onComplete={(result) => completeLesson(lesson, result)}
      onNext={() => router.back()}
      onClose={() => router.back()}
    />
  );
}
