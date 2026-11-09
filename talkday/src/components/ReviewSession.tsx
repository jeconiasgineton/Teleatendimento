import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { FeedbackBanner } from '@/components/FeedbackBanner';
import { PhraseInput } from '@/components/PhraseInput';
import { WordBank } from '@/components/WordBank';
import { useSettings } from '@/context/SettingsContext';
import { BLANK, checkComplete, checkTranslate, makeBlank, sentenceTokens, type ReviewQuestion } from '@/domain/review';
import { useReviewSession } from '@/hooks/useReviewSession';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { speak, stopSpeaking } from '@/services/speech';
import { colors, radius, space } from '@/theme';

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface Props {
  questions: ReviewQuestion[];
  onGraded: (wordId: string, correct: boolean) => void;
  onExit: () => void;
}

export function ReviewSession({ questions, onGraded, onExit }: Props) {
  const { accent, rate } = useSettings();
  const s = useReviewSession({
    questions,
    onGraded,
    reference: (q) => q.word.example,
    grade: (q, a) => (q.kind === 'complete' ? checkComplete(String(a), q.word.text) : checkTranslate(a as string[], q.word.example)),
  });

  const [input, setInput] = useState('');
  const [chosen, setChosen] = useState<number[]>([]);
  const mic = useSpeechInput(accent, (t) => setInput(t));

  const q = s.question;
  // Embaralha as palavras uma vez por pergunta.
  const bank = useMemo(() => (q && q.kind === 'translate' ? shuffle(sentenceTokens(q.word.example)) : []), [q]);

  useEffect(() => {
    setInput('');
    setChosen([]);
  }, [s.index]);

  // Depois de responder, fala a frase completa para treinar a pronúncia.
  useEffect(() => {
    if (s.feedback && q) speak(q.word.example, accent, rate);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.feedback]);

  if (s.finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.done}>
          <Text style={styles.emoji}>✅</Text>
          <Text style={styles.title}>Revisão concluída!</Text>
          <Text style={styles.sub}>
            {s.correctFirst} de {s.total} palavras certas de primeira. As que errou voltam mais cedo.
          </Text>
          <View style={styles.full}>
            <BigButton label="Concluir" onPress={onExit} />
          </View>
        </View>
      </SafeAreaView>
    );
  }
  if (!q) return null;

  const locked = s.feedback !== null;
  const canCheck = !locked && (q.kind === 'complete' ? input.trim().length > 0 : chosen.length > 0);
  const submit = () => {
    if (mic.listening) mic.stop();
    s.answer(q.kind === 'complete' ? input.trim() : chosen.map((i) => bank[i]));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Sair da revisão" hitSlop={12}>
              <Ionicons name="close" size={28} color={colors.muted} />
            </Pressable>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, (s.index / s.queueLength) * 100)}%` }]} />
            </View>
          </View>

          <Text style={styles.kind}>{q.kind === 'complete' ? 'Complete a frase' : 'Traduza a frase'}</Text>

          {q.kind === 'complete' ? (
            <>
              <Text style={styles.sentence}>{makeBlank(q.word.example, q.word.text).replace(BLANK, '＿＿＿')}</Text>
              <Text style={styles.hint}>{q.word.examplePt}</Text>
              <PhraseInput
                value={input}
                onChange={setInput}
                onSubmit={submit}
                editable={!locked}
                micSupported={mic.supported}
                listening={mic.listening}
                onMicPress={() => {
                  stopSpeaking();
                  if (mic.listening) mic.stop();
                  else {
                    setInput('');
                    mic.start();
                  }
                }}
                micError={mic.error}
              />
            </>
          ) : (
            <>
              <Text style={styles.sentence}>{q.word.examplePt}</Text>
              <WordBank
                tokens={bank}
                chosen={chosen}
                disabled={locked}
                onToggle={(i) => setChosen((c) => (c.includes(i) ? c.filter((x) => x !== i) : [...c, i]))}
              />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {s.feedback ? (
            <FeedbackBanner feedback={s.feedback} showListen onListenCorrect={() => speak(q.word.example, accent, rate)} />
          ) : null}
          {s.feedback ? (
            <BigButton label="Continuar" tone={s.feedback.correct ? 'primary' : 'danger'} onPress={s.next} />
          ) : (
            <BigButton label="Verificar" onPress={submit} disabled={!canCheck} />
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { padding: space.md, gap: space.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  track: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 7, backgroundColor: colors.accent },
  kind: { fontSize: 14, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  sentence: { fontSize: 28, fontWeight: '800', color: colors.text },
  hint: { fontSize: 16, color: colors.muted },
  footer: { padding: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, textAlign: 'center', borderRadius: radius.md },
  full: { alignSelf: 'stretch' },
});
