import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LessonStatus } from '@/domain/progress';
import type { Lesson } from '@/domain/types';
import { colors, radius, space } from '@/theme';

interface Props {
  lesson: Lesson;
  status: LessonStatus;
  score?: number;
  isLast: boolean;
  onPress: () => void;
}

const STATUS_LABEL: Record<LessonStatus, string> = {
  completed: 'concluída',
  current: 'lição atual',
  locked: 'bloqueada',
};

/** Uma fase na trilha: concluída (check), atual (destacada) ou bloqueada (cinza). */
export function LessonNode({ lesson, status, score, isLast, onPress }: Props) {
  const done = status === 'completed';
  const current = status === 'current';
  const locked = status === 'locked';
  const tone = done ? colors.primary : current ? colors.accent : colors.locked;
  return (
    <View style={styles.row}>
      <View style={styles.rail}>
        <View style={[styles.circle, { backgroundColor: locked ? colors.border : tone, borderColor: locked ? colors.border : tone }]}>
          {done ? (
            <Ionicons name="checkmark" size={26} color="#fff" />
          ) : locked ? (
            <Ionicons name="lock-closed" size={20} color={colors.locked} />
          ) : (
            <Text style={styles.num}>{lesson.id}</Text>
          )}
        </View>
        {!isLast ? <View style={[styles.line, done && { backgroundColor: colors.primary }]} /> : null}
      </View>
      <Pressable
        disabled={locked}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Lição ${lesson.id}, ${lesson.title}, ${STATUS_LABEL[status]}`}
        accessibilityState={{ disabled: locked }}
        style={[styles.card, current && styles.cardCurrent, locked && styles.cardLocked]}
      >
        <Text style={[styles.title, locked && styles.lockedText]}>
          {lesson.id}. {lesson.title}
        </Text>
        <Text style={[styles.words, locked && styles.lockedText]} numberOfLines={2}>
          {lesson.words.map((w) => w.text).join(' · ')}
        </Text>
        {done ? <Text style={styles.meta}>Nota {score ?? 100}% · toque para refazer</Text> : null}
        {current ? <Text style={styles.cta}>COMEÇAR →</Text> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md },
  rail: { alignItems: 'center', width: 48 },
  circle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  num: { color: '#fff', fontWeight: '800', fontSize: 18 },
  line: { flex: 1, width: 4, backgroundColor: colors.border, marginVertical: 2, minHeight: 16 },
  card: {
    flex: 1,
    marginBottom: space.md,
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: 4,
  },
  cardCurrent: { borderColor: colors.accent, backgroundColor: colors.accentSoft, borderBottomWidth: 4 },
  cardLocked: { backgroundColor: colors.surface, borderColor: colors.surface },
  title: { fontSize: 16, fontWeight: '800', color: colors.text },
  words: { fontSize: 14, color: colors.muted },
  lockedText: { color: colors.locked },
  meta: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  cta: { fontSize: 13, color: colors.accentDark, fontWeight: '800', marginTop: 4 },
});
