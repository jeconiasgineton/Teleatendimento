import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSettings } from '@/context/SettingsContext';
import type { Accent } from '@/domain/types';
import { speak } from '@/services/speech';
import { colors, radius, space } from '@/theme';

const ACCENTS: { value: Accent; label: string }[] = [
  { value: 'en-US', label: 'Americano (en-US)' },
  { value: 'en-GB', label: 'Britânico (en-GB)' },
];

export default function Settings() {
  const { accent, setAccent, rate, setRate } = useSettings();
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.h1}>Ajustes</Text>
        <Text style={styles.h2}>Sotaque do inglês</Text>
        {ACCENTS.map((a) => (
          <Pressable
            key={a.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: accent === a.value }}
            onPress={() => {
              setAccent(a.value);
              speak('Hello! Let us practice.', a.value, rate);
            }}
            style={[styles.option, accent === a.value && styles.selected]}
          >
            <Text style={styles.optionText}>{a.label}</Text>
          </Pressable>
        ))}
        <Text style={styles.h2}>Velocidade da voz</Text>
        <View style={styles.row}>
          {[0.7, 0.9, 1.1].map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected: rate === r }}
              onPress={() => {
                setRate(r);
                speak('Hello! Let us practice.', accent, r);
              }}
              style={[styles.option, styles.flex, rate === r && styles.selected]}
            >
              <Text style={styles.optionText}>{r === 0.7 ? 'Lenta' : r === 0.9 ? 'Normal' : 'Rápida'}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.md, gap: space.sm },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: space.sm },
  h2: { fontSize: 14, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', marginTop: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  option: { borderWidth: 2, borderBottomWidth: 4, borderColor: colors.border, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  optionText: { fontSize: 16, fontWeight: '700', color: colors.text },
});
