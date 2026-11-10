import { StyleSheet, Text, View } from 'react-native';
import type { CourseStats } from '@/domain/progress';
import { colors, radius, space } from '@/theme';

/** Palavras aprendidas e barra até o objetivo de três meses. */
export function GoalHeader({ stats }: { stats: CourseStats }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>Palavras aprendidas</Text>
      <Text style={styles.big}>
        {stats.wordsLearned}
        <Text style={styles.of}> / {stats.totalWords}</Text>
      </Text>
      <View
        style={styles.track}
        accessibilityRole="progressbar"
        accessibilityLabel="Progresso até o objetivo de três meses"
        accessibilityValue={{ min: 0, max: 100, now: stats.percent }}
      >
        <View style={[styles.fill, { width: `${Math.max(stats.percent, stats.percent > 0 ? 3 : 0)}%` }]} />
      </View>
      <View style={styles.row}>
        <Text style={styles.meta}>{stats.percent}% do objetivo de 3 meses</Text>
        <Text style={styles.meta}>
          Dia {stats.day} de {stats.goalDays}
        </Text>
      </View>
      <Text style={styles.meta}>
        {stats.lessonsDone} de {stats.totalLessons} lições concluídas
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: space.sm, marginBottom: space.lg },
  label: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase' },
  big: { fontSize: 44, fontWeight: '800', color: colors.primaryDark },
  of: { fontSize: 20, color: colors.muted, fontWeight: '700' },
  track: { height: 18, borderRadius: 9, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 9, backgroundColor: colors.primary },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  meta: { fontSize: 13, color: colors.muted, fontWeight: '600' },
});
