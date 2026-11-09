import { StyleSheet, Text, View } from 'react-native';
import { PART_LABELS } from '@/domain/steps';
import type { StepKind } from '@/domain/types';
import { colors, space } from '@/theme';

export function StepProgress({ index, total, kind }: { index: number; total: number; kind: StepKind }) {
  const part = PART_LABELS[kind];
  return (
    <View style={styles.wrap}>
      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: index }}>
        <View style={[styles.fill, { width: `${Math.max(4, (index / total) * 100)}%` }]} />
      </View>
      <Text style={styles.label}>
        Parte {part.n} de 3 · {part.title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  track: { height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7, backgroundColor: colors.primary },
  label: { color: colors.muted, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
});
