import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef } from 'react';
import { FlatList, Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GoalHeader } from '@/components/GoalHeader';
import { LessonNode } from '@/components/LessonNode';
import { useAccount } from '@/context/AccountContext';
import { useEntitlement } from '@/context/EntitlementContext';
import { useProgress } from '@/context/ProgressContext';
import { LESSONS } from '@/data/lessons';
import { courseStats, lessonStatus } from '@/domain/progress';
import { colors, space } from '@/theme';

export default function Progress() {
  const router = useRouter();
  const { state, currentLesson } = useProgress();
  const { can } = useEntitlement();
  const account = useAccount();
  const stats = useMemo(() => courseStats(state, LESSONS, Date.now()), [state]);
  const list = useRef<FlatList>(null);

  // Abre a trilha já na lição atual.
  useEffect(() => {
    if (currentLesson && currentLesson > 3) {
      const t = setTimeout(() => list.current?.scrollToIndex({ index: currentLesson - 1, viewPosition: 0.2, animated: false }), 50);
      return () => clearTimeout(t);
    }
  }, [currentLesson]);

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList
        ref={list}
        data={LESSONS}
        keyExtractor={(l) => String(l.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <Text style={styles.h1}>Progresso</Text>
            {!account.signedIn && state.learned.length > 0 ? (
              <Pressable onPress={() => router.push('/account')} accessibilityRole="button" style={styles.saveCard}>
                <Text style={styles.saveTitle}>☁️ Salve seu progresso</Text>
                <Text style={styles.saveText}>Crie uma conta e recupere seu histórico em qualquer aparelho. Toque para criar ou entrar.</Text>
              </Pressable>
            ) : null}
            <GoalHeader stats={stats} />
          </>
        }
        onScrollToIndexFailed={(info) => list.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false })}
        renderItem={({ item, index }) => {
          const status = lessonStatus(state, item.id, LESSONS);
          return (
            <LessonNode
              lesson={item}
              status={status}
              score={state.completed[item.id]?.score}
              isLast={index === LESSONS.length - 1}
              testUnlock={can('unlock-all')}
              onPress={() => (status === 'current' ? router.navigate('/') : router.push({ pathname: '/lesson/[id]', params: { id: String(item.id) } }))}
            />
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: space.md },
  saveCard: { backgroundColor: colors.accentSoft, borderRadius: 16, padding: space.md, gap: 4, marginBottom: space.md },
  saveTitle: { fontSize: 16, fontWeight: '800', color: colors.accentDark },
  saveText: { fontSize: 14, color: colors.text },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: space.md },
});
