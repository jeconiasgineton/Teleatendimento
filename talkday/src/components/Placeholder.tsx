import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, space } from '@/theme';

export function Placeholder({ title, phase }: { title: string; phase: string }) {
  return (
    <SafeAreaView style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>Em construção — {phase}.</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.sm, backgroundColor: colors.bg },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  text: { color: colors.muted },
});
