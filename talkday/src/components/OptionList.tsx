import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, space } from '@/theme';

interface Props {
  options: string[];
  selected: string | null;
  onSelect: (o: string) => void;
  disabled: boolean;
  correct?: string | null;
}

export function OptionList({ options, selected, onSelect, disabled, correct }: Props) {
  return (
    <View style={styles.wrap}>
      {options.map((o) => {
        const isSel = selected === o;
        const isRight = correct === o;
        return (
          <Pressable
            key={o}
            disabled={disabled}
            onPress={() => onSelect(o)}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSel, disabled }}
            style={[styles.option, isSel && styles.selected, isRight && styles.right]}
          >
            <Text style={[styles.text, (isSel || isRight) && styles.textOn]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  option: {
    borderWidth: 2,
    borderBottomWidth: 4,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    backgroundColor: colors.bg,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  right: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  text: { fontSize: 18, fontWeight: '600', color: colors.text },
  textOn: { color: colors.text },
});
