import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

interface Props {
  title: string;
  subtitle?: string;
  onListen: () => void;
  listenLabel?: string;
}

/** Palavra em destaque no topo + botão para ouvir a pronúncia. */
export function WordHero({ title, subtitle, onListen, listenLabel = 'Ouvir pronúncia' }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title} accessibilityRole="header" adjustsFontSizeToFit numberOfLines={1}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <Pressable
        onPress={onListen}
        accessibilityRole="button"
        accessibilityLabel={listenLabel}
        style={({ pressed }) => [styles.listen, pressed && styles.pressed]}
      >
        <Ionicons name="volume-high" size={22} color="#fff" />
        <Text style={styles.listenText}>{listenLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  title: { fontSize: 56, fontWeight: '800', color: colors.text, textAlign: 'center' },
  subtitle: { fontSize: 18, color: colors.muted, textAlign: 'center' },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderBottomWidth: 4,
    borderBottomColor: colors.accentDark,
    paddingHorizontal: space.lg,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: space.sm,
  },
  pressed: { opacity: 0.85, transform: [{ translateY: 2 }] },
  listenText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase' },
});
