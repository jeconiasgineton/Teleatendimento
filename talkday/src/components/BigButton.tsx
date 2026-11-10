import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius } from '@/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'danger' | 'ghost';
}

export function BigButton({ label, onPress, disabled, tone = 'primary' }: Props) {
  const bg = disabled ? colors.border : tone === 'danger' ? colors.error : tone === 'ghost' ? 'transparent' : colors.primary;
  const edge = disabled ? colors.locked : tone === 'danger' ? colors.errorDark : tone === 'ghost' ? 'transparent' : colors.primaryDark;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, borderBottomColor: edge }, pressed && styles.pressed]}
    >
      <Text style={[styles.text, tone === 'ghost' && { color: colors.muted }, disabled && { color: colors.locked }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { borderRadius: radius.md, borderBottomWidth: 4, paddingVertical: 14, alignItems: 'center' },
  pressed: { opacity: 0.9, transform: [{ translateY: 2 }] },
  text: { color: '#fff', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
});
