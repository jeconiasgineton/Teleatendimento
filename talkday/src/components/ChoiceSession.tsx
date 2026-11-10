import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { FeedbackBanner } from '@/components/FeedbackBanner';
import { OptionList } from '@/components/OptionList';
import { useSettings } from '@/context/SettingsContext';
import { randomError, randomSuccess } from '@/data/messages';
import { PASS_PERCENT, type ChoiceQuestion } from '@/domain/practice';
import type { Feedback } from '@/hooks/useExercise';
import { speak, stopSpeaking } from '@/services/speech';
import { colors, radius, space } from '@/theme';

interface Props {
  title: string;
  questions: ChoiceQuestion[];
  /** Chamado uma vez ao terminar, com o percentual de acertos. */
  onFinish: (percent: number) => void;
  onRetry: () => void;
  onExit: () => void;
}

/** Sessão de múltipla escolha (vocabulário de trabalho e compreensão de falas). */
export function ChoiceSession({ title, questions, onFinish, onRetry, onExit }: Props) {
  const { accent, rate } = useSettings();
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [hits, setHits] = useState(0);
  const reported = useRef(false);

  const q = questions[index] as ChoiceQuestion | undefined;
  const finished = index >= questions.length;
  const percent = questions.length ? Math.round((hits / questions.length) * 100) : 0;

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      onFinish(percent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  useEffect(() => {
    if (q?.speak) speak(q.speak, accent, rate);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  // Depois de responder, fala a frase completa em inglês.
  useEffect(() => {
    if (feedback && q) speak(q.reveal, accent, rate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feedback]);

  if (finished) {
    const passed = percent >= PASS_PERCENT;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.done}>
          <Text style={styles.emoji}>{passed ? '🏆' : '💪'}</Text>
          <Text style={styles.title}>{passed ? 'Pacote concluído!' : 'Quase lá!'}</Text>
          <Text style={styles.sub}>
            Você acertou {hits} de {questions.length} ({percent}%).
            {passed ? '' : ` Acerte pelo menos ${PASS_PERCENT}% para concluir.`}
          </Text>
          <View style={styles.full}>
            <BigButton label="Concluir" onPress={onExit} />
            <BigButton label="Tentar de novo" tone="ghost" onPress={onRetry} />
          </View>
        </View>
      </SafeAreaView>
    );
  }
  if (!q) return null;

  const answered = feedback !== null;
  const check = () => {
    if (selected === null || answered) return;
    const ok = selected === q.answer;
    if (ok) setHits((n) => n + 1);
    setFeedback({
      correct: ok,
      message: ok ? randomSuccess() : randomError(),
      corrected: q.answer,
      explanationPt: ok ? '' : q.explanation,
    });
  };
  const next = () => {
    setFeedback(null);
    setSelected(null);
    setIndex((i) => i + 1);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.top}>
          <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Sair" hitSlop={12}>
            <Ionicons name="close" size={28} color={colors.muted} />
          </Pressable>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.max(4, (index / questions.length) * 100)}%` }]} />
          </View>
        </View>
        <Text style={styles.kicker}>{title}</Text>
        <Text style={styles.heading}>{q.heading}</Text>

        {q.big ? <Text style={styles.big}>{q.big}</Text> : null}
        {q.small ? <Text style={styles.small}>{q.small}</Text> : null}

        {q.speak ? (
          <View style={styles.listenRow}>
            <Pressable
              onPress={() => speak(q.speak!, accent, rate)}
              accessibilityRole="button"
              accessibilityLabel="Ouvir"
              style={styles.listen}
            >
              <Ionicons name="volume-high" size={28} color="#fff" />
              <Text style={styles.listenText}>Ouvir</Text>
            </Pressable>
            <Pressable
              onPress={() => speak(q.speak!, accent, 0.55)}
              accessibilityRole="button"
              accessibilityLabel="Ouvir devagar"
              style={[styles.listen, styles.slow]}
            >
              <Ionicons name="walk" size={24} color={colors.accentDark} />
              <Text style={[styles.listenText, { color: colors.accentDark }]}>Devagar</Text>
            </Pressable>
          </View>
        ) : null}

        <OptionList options={q.options} selected={selected} onSelect={setSelected} disabled={answered} correct={answered ? q.answer : null} />
      </ScrollView>

      <View style={styles.footer}>
        {feedback ? (
          <FeedbackBanner feedback={feedback} showListen onListenCorrect={() => speak(q.reveal, accent, rate)} />
        ) : null}
        {answered ? (
          <BigButton label="Continuar" tone={feedback.correct ? 'primary' : 'danger'} onPress={next} />
        ) : (
          <BigButton label="Verificar" onPress={check} disabled={selected === null} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.md, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7, backgroundColor: colors.accent },
  kicker: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  heading: { fontSize: 20, fontWeight: '800', color: colors.text },
  big: { fontSize: 34, fontWeight: '800', color: colors.text },
  small: { fontSize: 16, color: colors.muted },
  listenRow: { flexDirection: 'row', gap: space.sm },
  listen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.accent,
    borderBottomWidth: 4,
    borderBottomColor: colors.accentDark,
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  slow: { backgroundColor: colors.accentSoft, borderBottomColor: colors.accent },
  listenText: { color: '#fff', fontWeight: '800', fontSize: 15, textTransform: 'uppercase' },
  footer: { padding: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  full: { alignSelf: 'stretch', gap: space.xs },
});
