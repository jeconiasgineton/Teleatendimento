import { Ionicons } from '@expo/vector-icons';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChoiceSession } from '@/components/ChoiceSession';
import { MeetingSession } from '@/components/MeetingSession';
import { useProgress } from '@/context/ProgressContext';
import { LISTEN_PACKS, MEETING_PACKS, VOCAB_PACKS, getPractice } from '@/data/practice';
import {
  buildListenQuestions,
  buildVocabQuestions,
  packStatus,
  type ListenPack,
  type MeetingPack,
  type PackBase,
  type VocabPack,
} from '@/domain/practice';
import { colors, radius, space } from '@/theme';

/** Lista os pacotes de uma prática e roda a sessão escolhida. */
export default function PackRoute() {
  const { kind } = useLocalSearchParams<{ kind: string }>();
  const router = useRouter();
  const { state, completePractice } = useProgress();
  const info = getPractice(String(kind));
  const [active, setActive] = useState<{ pack: PackBase; run: number } | null>(null);

  const questions = useMemo(() => {
    if (!active) return [];
    if (kind === 'vocab') return buildVocabQuestions(active.pack as VocabPack);
    if (kind === 'listen') return buildListenQuestions(active.pack as ListenPack);
    return [];
    // `run` força novo sorteio ao tentar de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.pack.id, active?.run, kind]);

  if (!info) return <Redirect href="/practice" />;

  if (active) {
    const exit = () => setActive(null);
    const retry = () => setActive({ pack: active.pack, run: active.run + 1 });
    const key = `${active.pack.id}:${active.run}`;
    if (kind === 'meeting') {
      const pack = MEETING_PACKS.find((p) => p.id === active.pack.id) as MeetingPack;
      return (
        <MeetingSession
          key={key}
          pack={pack}
          onFinish={(pct) => completePractice(pack.id, pct)}
          onRetry={retry}
          onExit={exit}
        />
      );
    }
    return (
      <ChoiceSession
        key={key}
        title={active.pack.title}
        questions={questions}
        onFinish={(pct) => completePractice(active.pack.id, pct)}
        onRetry={retry}
        onExit={exit}
      />
    );
  }

  const meetingGoal = (id: string) => MEETING_PACKS.find((p) => p.id === id)?.goalPt;
  const details = (p: PackBase): string => {
    if (kind === 'meeting') return meetingGoal(p.id) ?? '';
    if (kind === 'vocab') return (VOCAB_PACKS.find((v) => v.id === p.id)?.words ?? []).map((w) => w.text).join(' · ');
    return `${LISTEN_PACKS.find((l) => l.id === p.id)?.lines.length ?? 0} falas para entender`;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Pressable onPress={() => router.navigate('/practice')} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.muted} />
        </Pressable>
        <Text style={styles.h1}>{info.title}</Text>
        <Text style={styles.sub}>{info.subtitle}</Text>

        {info.packs.map((p) => {
          const status = packStatus(state, p);
          const locked = status === 'locked';
          const best = state.practice[p.id]?.best;
          return (
            <Pressable
              key={p.id}
              disabled={locked}
              onPress={() => setActive({ pack: p, run: 0 })}
              accessibilityRole="button"
              accessibilityLabel={`${p.title}, ${locked ? `bloqueado até a lição ${p.unlockAfter}` : status === 'done' ? 'concluído' : 'disponível'}`}
              accessibilityState={{ disabled: locked }}
              style={[styles.card, status === 'available' && styles.cardOpen, status === 'done' && styles.cardDone, locked && styles.cardLocked]}
            >
              <View style={styles.row}>
                <Text style={[styles.cardTitle, locked && styles.lockedText]}>{p.title}</Text>
                {status === 'done' ? (
                  <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
                ) : locked ? (
                  <Ionicons name="lock-closed" size={22} color={colors.locked} />
                ) : null}
              </View>
              <Text style={[styles.cardText, locked && styles.lockedText]}>
                {locked ? `Conclua a lição ${p.unlockAfter} do curso para liberar.` : details(p)}
              </Text>
              {status === 'done' ? <Text style={styles.meta}>Melhor resultado: {best}% · toque para refazer</Text> : null}
              {status === 'available' ? <Text style={styles.cta}>COMEÇAR →</Text> : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.md, gap: space.md },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, marginTop: -space.sm },
  card: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: space.md, gap: 6, backgroundColor: colors.bg },
  cardOpen: { borderColor: colors.accent, backgroundColor: colors.accentSoft, borderBottomWidth: 4 },
  cardDone: { borderColor: colors.primary },
  cardLocked: { backgroundColor: colors.surface, borderColor: colors.surface },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, flexShrink: 1 },
  cardText: { fontSize: 14, color: colors.muted },
  lockedText: { color: colors.locked },
  meta: { fontSize: 12, color: colors.primaryDark, fontWeight: '700' },
  cta: { fontSize: 13, color: colors.accentDark, fontWeight: '800', marginTop: 2 },
});
