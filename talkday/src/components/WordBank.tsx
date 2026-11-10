import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

interface Props {
  tokens: string[];
  /** Índices (em `tokens`) já escolhidos, na ordem. */
  chosen: number[];
  onToggle: (index: number) => void;
  disabled: boolean;
}

/** Monte a frase tocando nas palavras (estilo Duolingo). */
export function WordBank({ tokens, chosen, onToggle, disabled }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.answer} accessibilityLabel="Sua frase">
        {chosen.map((i) => (
          <Pressable key={i} disabled={disabled} onPress={() => onToggle(i)} style={styles.chip} accessibilityRole="button">
            <Text style={styles.chipText}>{tokens[i]}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.pool}>
        {tokens.map((t, i) => {
          const used = chosen.includes(i);
          return (
            <Pressable
              key={i}
              disabled={disabled || used}
              onPress={() => onToggle(i)}
              style={[styles.chip, used && styles.used]}
              accessibilityRole="button"
              accessibilityState={{ disabled: used }}
            >
              <Text style={[styles.chipText, used && { color: 'transparent' }]}>{t}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  answer: {
    minHeight: 72,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    padding: space.sm,
    borderBottomWidth: 2,
    borderTopWidth: 2,
    borderColor: colors.border,
  },
  pool: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, justifyContent: 'center' },
  chip: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    backgroundColor: colors.bg,
  },
  used: { backgroundColor: colors.surface, borderColor: colors.surface },
  chipText: { fontSize: 18, fontWeight: '600', color: colors.text },
});
