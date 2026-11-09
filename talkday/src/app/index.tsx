import { ExerciseScreen } from '@/components/ExerciseScreen';
import { LESSONS } from '@/data/lessons';

// Fase 4: a lição atual virá do progresso salvo. Por ora, sempre a lição 1.
export default function Index() {
  return <ExerciseScreen lesson={LESSONS[0]} />;
}
