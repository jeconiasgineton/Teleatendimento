import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BigButton } from '@/components/BigButton';
import { colors, radius, space } from '@/theme';

/** Aviso de recurso exclusivo do Premium, com o caminho para ativar. */
export function PremiumGate({ title, text }: { title: string; text: string }) {
  const router = useRouter();
  return (
    <View style={styles.card} accessibilityRole="summary">
      <Text style={styles.emoji}>⭐</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.text}>{text}</Text>
      <View style={styles.full}>
        <BigButton label="Ver o Premium" onPress={() => router.push('/premium')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, alignItems: 'center', gap: space.sm },
  emoji: { fontSize: 44 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  full: { alignSelf: 'stretch', marginTop: space.sm },
});
