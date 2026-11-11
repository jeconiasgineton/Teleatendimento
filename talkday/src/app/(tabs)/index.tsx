import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ExerciseScreen } from '@/components/ExerciseScreen';
import { useProgress } from '@/context/ProgressContext';
import { getLesson } from '@/data/lessons';
import type { LessonResult } from '@/domain/progress';
import { colors, space } from '@/theme';

/** Sempre mostra a lição atual (a primeira ainda não concluída). */
export default function Index() {
  const { currentLesson, completeLesson } = useProgress();
  const [activeId, setActiveId] = useState<number | null>(currentLesson);
  // Depois de concluir, mantemos a tela final até o aluno tocar em "Próxima lição".
  const holdFinished = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!holdFinished.current) setActiveId(currentLesson);
    }, [currentLesson]),
  );

  const lesson = activeId !== null ? getLesson(activeId) : undefined;
  if (!lesson) {
    return (
      <SafeAreaView style={styles.done}>
        <Text style={styles.emoji}>🎓</Text>
        <Text style={styles.title}>Curso concluído!</Text>
        <Text style={styles.text}>Você passou por todas as lições. Continue praticando na aba Revisão.</Text>
      </SafeAreaView>
    );
  }

  return (
    <ExerciseScreen
      key={lesson.id}
      lesson={lesson}
      onComplete={(result: LessonResult) => {
        const passed = completeLesson(lesson, result);
        holdFinished.current = passed;
        return passed;
      }}
      onNext={() => {
        holdFinished.current = false;
        setActiveId(currentLesson);
      }}
    />
  );
}

const styles = StyleSheet.create({
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md, backgroundColor: colors.bg },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  text: { color: colors.muted, textAlign: 'center', fontSize: 16 },
});
