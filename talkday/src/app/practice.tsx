import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useProgress } from '@/context/ProgressContext';
import { PRACTICES, type PracticeInfo } from '@/data/practice';
import { packStatus } from '@/domain/practice';
import { colors, radius, space } from '@/theme';

export default function Practice() {
  const router = useRouter();
  const { state } = useProgress();

  const summary = (p: PracticeInfo) => {
    const statuses = p.packs.map((pk) => packStatus(state, pk));
    const done = statuses.filter((s) => s === 'done').length;
    const open = statuses.some((s) => s !== 'locked');
    const firstLocked = p.packs.find((pk) => packStatus(state, pk) === 'locked');
    return { done, open, firstLocked };
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Praticar</Text>
        <Text style={styles.intro}>Treinos extras de inglês para o trabalho. Eles liberam conforme você avança no curso.</Text>

        {PRACTICES.map((p) => {
          const s = summary(p);
          return (
            <Pressable
              key={p.kind}
              disabled={!s.open}
              onPress={() => router.push({ pathname: '/pack/[kind]', params: { kind: p.kind } })}
              accessibilityRole="button"
              accessibilityState={{ disabled: !s.open }}
              style={({ pressed }) => [styles.card, !s.open && styles.cardLocked, pressed && styles.pressed]}
            >
              <Text style={[styles.title, !s.open && styles.lockedText]}>{p.title}</Text>
              <Text style={[styles.subtitle, !s.open && styles.lockedText]}>{p.subtitle}</Text>
              <View style={[styles.tip, !s.open && styles.tipLocked]}>
                <Text style={[styles.tipText, !s.open && styles.lockedText]}>✦ {p.description}</Text>
              </View>
              <Text style={[styles.status, !s.open && styles.lockedText]}>
                {s.open
                  ? `${s.done} de ${p.packs.length} pacotes concluídos`
                  : `Conclua a lição ${s.firstLocked?.unlockAfter ?? ''} para liberar`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  body: { padding: space.md, gap: space.md },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  intro: { fontSize: 15, color: colors.muted, marginTop: -space.sm },
  card: { backgroundColor: colors.bg, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  cardLocked: { opacity: 0.7 },
  pressed: { opacity: 0.9 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: 17, color: colors.text },
  tip: {
    backgroundColor: colors.accentSoft,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    borderRadius: radius.md,
    padding: space.md,
  },
  tipLocked: { backgroundColor: colors.surface, borderColor: colors.border },
  tipText: { fontSize: 16, color: colors.accentDark },
  status: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  lockedText: { color: colors.locked },
});
