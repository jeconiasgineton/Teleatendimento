import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { FeedbackBanner } from '@/components/FeedbackBanner';
import { PhraseInput } from '@/components/PhraseInput';
import { useSettings } from '@/context/SettingsContext';
import { randomError, randomSuccess } from '@/data/messages';
import { PASS_PERCENT, type MeetingPack } from '@/domain/practice';
import type { ConversationTurn } from '@/domain/types';
import { ATTEMPTS_BEFORE_LISTEN, ATTEMPTS_BEFORE_SKIP, type Feedback } from '@/hooks/useExercise';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { aiClient } from '@/services/ai';
import { speak, stopSpeaking } from '@/services/speech';
import { colors, radius, space } from '@/theme';

interface Props {
  pack: MeetingPack;
  onFinish: (percent: number) => void;
  onRetry: () => void;
  onExit: () => void;
}

type Phase = 'answering' | 'checking' | 'correct' | 'wrong';

/** Mini conversa de reunião: o Gemini faz as perguntas e corrige as respostas. */
export function MeetingSession({ pack, onFinish, onRetry, onExit }: Props) {
  const { accent, rate } = useSettings();
  const total = pack.turns.length;
  const [index, setIndex] = useState(0);
  const [turn, setTurn] = useState<ConversationTurn | null>(null);
  const [phase, setPhase] = useState<Phase>('answering');
  const [attempts, setAttempts] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [input, setInput] = useState('');
  const [skipped, setSkipped] = useState(0);
  const turns = useRef(new Map<number, Promise<ConversationTurn>>());
  const log = useRef<{ coach: string; student: string }[]>([]);
  const reported = useRef(false);

  const mic = useSpeechInput(accent, (t) => setInput(t));
  const finished = index >= total;
  const percent = Math.round(((total - skipped) / total) * 100);

  /** Pergunta do turno pela IA; qualquer falha usa a pergunta de reserva do pacote. */
  const requestTurn = useCallback(
    (i: number): Promise<ConversationTurn> => {
      let p = turns.current.get(i);
      if (!p) {
        const fallback = pack.turns[i];
        p = (aiClient.nextCoachTurn
          ? aiClient.nextCoachTurn({ words: pack.words, history: log.current.slice(-3), accent, topic: pack.topic })
          : Promise.reject(new Error('sem IA'))
        ).catch(() => fallback);
        turns.current.set(i, p);
      }
      return p;
    },
    [pack, accent],
  );

  useEffect(() => {
    if (index >= total) return;
    let alive = true;
    setTurn(null);
    requestTurn(index).then((t) => alive && setTurn(t));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    if (turn) speak(turn.coach, accent, rate);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turn?.coach]);

  useEffect(() => {
    if (finished && !reported.current) {
      reported.current = true;
      onFinish(percent);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const advance = (student: string, gaveUp: boolean) => {
    if (turn) log.current.push({ coach: turn.coach, student });
    if (gaveUp) setSkipped((n) => n + 1);
    setIndex((i) => i + 1);
    setInput('');
    setFeedback(null);
    setAttempts(0);
    setPhase('answering');
  };

  const submit = async () => {
    const sentence = input.trim();
    if (!turn || !sentence || phase === 'checking' || phase === 'correct') return;
    if (mic.listening) mic.stop();
    setPhase('checking');
    try {
      const r = await aiClient.checkSentence({
        mode: 'conversation',
        accent,
        sentence,
        targetWords: pack.words,
        context: turn.coach,
        reference: turn.suggestion,
        tip: `Use uma destas palavras: ${pack.words.slice(0, 6).map((w) => `"${w}"`).join(', ')}.`,
      });
      if (r.correct) {
        // Já pede a próxima pergunta enquanto o aluno lê o feedback.
        log.current.push({ coach: turn.coach, student: sentence });
        if (index + 1 < total) requestTurn(index + 1);
        log.current.pop();
        setFeedback({ correct: true, message: randomSuccess(), corrected: r.corrected, explanationPt: '', reply: r.reply });
        setPhase('correct');
      } else {
        setAttempts((a) => a + 1);
        setFeedback({ correct: false, message: randomError(), corrected: r.corrected, explanationPt: r.explanationPt });
        setPhase('wrong');
      }
    } catch {
      setPhase('answering');
      setFeedback({ correct: false, message: 'Ops, não consegui conferir agora. 📡', corrected: '', explanationPt: 'Verifique sua conexão e tente de novo.' });
    }
  };

  if (finished) {
    const passed = percent >= PASS_PERCENT;
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.done}>
          <Text style={styles.emoji}>{passed ? '🏆' : '💪'}</Text>
          <Text style={styles.title}>{passed ? 'Reunião concluída!' : 'Quase lá!'}</Text>
          <Text style={styles.sub}>
            {passed
              ? `Você participou de ${total - skipped} de ${total} perguntas sem desistir.`
              : 'Você pulou muitas perguntas. Tente de novo para concluir este pacote.'}
          </Text>
          <View style={styles.full}>
            <BigButton label="Concluir" onPress={onExit} />
            <BigButton label="Tentar de novo" tone="ghost" onPress={onRetry} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const locked = phase === 'checking' || phase === 'correct';
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.top}>
            <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel="Sair" hitSlop={12}>
              <Ionicons name="close" size={28} color={colors.muted} />
            </Pressable>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.max(4, (index / total) * 100)}%` }]} />
            </View>
          </View>
          <Text style={styles.kicker}>{pack.title}</Text>
          <Text style={styles.goal}>{pack.goalPt}</Text>

          <View style={styles.bubble} accessibilityLiveRegion="polite">
            {turn ? (
              <>
                <Text style={styles.bubbleEn}>{turn.coach}</Text>
                <Text style={styles.bubblePt}>{turn.coachPt}</Text>
                <Pressable onPress={() => speak(turn.coach, accent, rate)} accessibilityRole="button" style={styles.replay}>
                  <Ionicons name="volume-high" size={18} color={colors.accentDark} />
                  <Text style={styles.replayText}>Ouvir pergunta</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.thinking}>
                <ActivityIndicator color={colors.accentDark} />
                <Text style={styles.bubblePt}>Coach está pensando…</Text>
              </View>
            )}
          </View>

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
        </ScrollView>

        <View style={styles.footer}>
          {feedback ? (
            <FeedbackBanner
              feedback={feedback}
              showListen={attempts >= ATTEMPTS_BEFORE_LISTEN}
              onListenCorrect={() => turn && speak(turn.suggestion, accent, rate)}
            />
          ) : null}
          {phase === 'correct' ? (
            <BigButton label="Continuar" onPress={() => advance(input.trim(), false)} />
          ) : phase === 'wrong' ? (
            <View style={styles.actions}>
              <BigButton
                label="Tentar de novo"
                tone="danger"
                onPress={() => {
                  setFeedback(null);
                  setPhase('answering');
                }}
              />
              {attempts >= ATTEMPTS_BEFORE_SKIP ? <BigButton label="Pular" tone="ghost" onPress={() => advance('', true)} /> : null}
            </View>
          ) : (
            <BigButton
              label={phase === 'checking' ? 'Verificando…' : 'Verificar'}
              onPress={submit}
              disabled={!turn || input.trim().length === 0 || phase === 'checking'}
            />
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
  kicker: { fontSize: 13, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.5 },
  goal: { fontSize: 17, fontWeight: '700', color: colors.text },
  bubble: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md, gap: 6 },
  bubbleEn: { fontSize: 22, fontWeight: '800', color: colors.accentDark },
  bubblePt: { fontSize: 14, color: colors.muted },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  replay: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  replayText: { color: colors.accentDark, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
  footer: { padding: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actions: { gap: space.xs },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  emoji: { fontSize: 72 },
  title: { fontSize: 28, fontWeight: '800', color: colors.text },
  sub: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  full: { alignSelf: 'stretch', gap: space.xs },
});
