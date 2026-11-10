import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { FeedbackBanner } from '@/components/FeedbackBanner';
import { OptionList } from '@/components/OptionList';
import { PhraseInput } from '@/components/PhraseInput';
import { StepProgress } from '@/components/StepProgress';
import { WordHero } from '@/components/WordHero';
import { useEntitlement } from '@/context/EntitlementContext';
import { useSettings } from '@/context/SettingsContext';
import { levelForLesson } from '@/domain/level';
import { lessonPassed, type LessonResult } from '@/domain/progress';
import type { ConversationTurn, Lesson, Step } from '@/domain/types';
import { useExercise } from '@/hooks/useExercise';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { speak, stopSpeaking } from '@/services/speech';
import { colors, radius, space } from '@/theme';

function heroFor(step: Step, turn: ConversationTurn | null) {
  switch (step.kind) {
    case 'recognize':
      return { title: step.word.text, subtitle: undefined, speakText: step.word.text, label: 'Ouvir pronúncia' };
    case 'sentence':
      return { title: step.word.text, subtitle: step.word.pt, speakText: step.word.text, label: 'Ouvir pronúncia' };
    case 'conversation':
      return {
        title: step.lesson.words.map((w) => w.text).join(' · '),
        subtitle: 'Responda usando estas palavras',
        speakText: turn?.coach ?? '',
        label: 'Ouvir pergunta',
      };
  }
}

interface Props {
  lesson: Lesson;
  /** Chamado uma vez ao terminar; devolve true se a lição foi aprovada. */
  onComplete: (result: LessonResult) => boolean;
  /** Botão "Continuar" da tela final (aprovado). */
  onNext: () => void;
  nextLabel?: string;
  /** Se informado, mostra um X para sair no topo. */
  onClose?: () => void;
}

export function ExerciseScreen({ lesson, onComplete, onNext, nextLabel = 'Próxima lição', onClose }: Props) {
  const { accent, rate } = useSettings();
  const { can } = useEntitlement();
  const router = useRouter();
  const ex = useExercise(lesson, accent, { aiCoach: can('ai-coach'), level: levelForLesson(lesson.id) });
  const { step, phase, feedback } = ex;
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const mic = useSpeechInput(accent, (text) => setInput(text));

  // Fala a palavra/pergunta automaticamente quando o passo muda.
  // Na mini conversa, só fala depois que a pergunta do coach chegar.
  const stepKey = ex.index;
  const coachCoach = ex.turn?.coach;
  useEffect(() => {
    const text = step ? heroFor(step, ex.turn).speakText : '';
    if (text) speak(text, accent, rate);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, coachCoach]);

  const resetInputs = useCallback(() => {
    setInput('');
    setSelected(null);
  }, []);

  const reported = useRef(false);
  useEffect(() => {
    if (ex.finished && !reported.current) {
      reported.current = true;
      onComplete({ totalSteps: ex.steps.length, skipped: ex.skipped, missedWordIds: [...ex.missedWords] });
    }
    if (!ex.finished) reported.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ex.finished]);

  if (ex.finished) {
    const passed = lessonPassed({ totalSteps: ex.steps.length, skipped: ex.skipped });
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.done}>
          <Text style={styles.doneEmoji}>{passed ? '🏆' : '💪'}</Text>
          <Text style={styles.doneTitle}>{passed ? 'Lição concluída!' : 'Quase lá!'}</Text>
          <Text style={styles.doneText}>
            {!passed
              ? 'Você pulou muitos passos. Refaça a lição para liberar a próxima — você consegue!'
              : ex.missedWords.size === 0
                ? 'Sem nenhum erro. Impecável!'
                : `${ex.missedWords.size} palavra(s) vão para a revisão para você reforçar.`}
          </Text>
          <View style={styles.doneActions}>
            {passed ? <BigButton label={nextLabel} onPress={onNext} /> : null}
            <BigButton
              label={passed ? 'Refazer' : 'Tentar de novo'}
              tone={passed ? 'ghost' : 'primary'}
              onPress={() => {
                ex.restart();
                resetInputs();
              }}
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }
  if (!step) return null;

  const hero = heroFor(step, ex.turn);
  const waitingCoach = step.kind === 'conversation' && !ex.turn;
  const locked = phase === 'checking' || phase === 'correct';
  const isRecognize = step.kind === 'recognize';
  const canSubmit = !locked && !waitingCoach && (isRecognize ? selected !== null : input.trim().length > 0);
  const referenceText = step.kind === 'recognize' ? step.word.text : step.kind === 'sentence' ? step.word.example : (ex.turn ?? step.turn).suggestion;

  const onSubmit = () => {
    if (mic.listening) mic.stop();
    ex.submit(isRecognize ? (selected ?? '') : input.trim());
  };

  const onMicPress = () => {
    stopSpeaking();
    if (mic.listening) mic.stop();
    else {
      setInput('');
      mic.start();
    }
  };

  const instruction =
    step.kind === 'recognize'
      ? 'Qual é o significado desta palavra?'
      : step.kind === 'sentence'
        ? `Diga ou escreva uma frase curta com "${step.word.text}".`
        : 'Responda ao coach em inglês.';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topRow}>
            {onClose ? (
              <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Sair da lição" hitSlop={12}>
                <Ionicons name="close" size={28} color={colors.muted} />
              </Pressable>
            ) : null}
            <View style={styles.flex}>
              <StepProgress index={ex.index} total={ex.steps.length} kind={step.kind} />
            </View>
          </View>
          <WordHero
            title={hero.title}
            subtitle={hero.subtitle}
            listenLabel={hero.label}
            onListen={() => hero.speakText && speak(hero.speakText, accent, rate)}
          />

          {step.kind === 'conversation' ? (
            <View style={styles.bubble} accessibilityLiveRegion="polite">
              {ex.turn ? (
                <>
                  <Text style={styles.bubbleEn}>{ex.turn.coach}</Text>
                  <Text style={styles.bubblePt}>{ex.turn.coachPt}</Text>
                </>
              ) : (
                <View style={styles.thinking}>
                  <ActivityIndicator color={colors.accentDark} />
                  <Text style={styles.bubblePt}>Coach está pensando…</Text>
                </View>
              )}
            </View>
          ) : null}

          <Text style={styles.instruction}>{instruction}</Text>

          {isRecognize ? (
            <OptionList
              options={step.options}
              selected={selected}
              onSelect={setSelected}
              disabled={locked}
              correct={phase === 'correct' ? step.answer : null}
            />
          ) : (
            <PhraseInput
              value={input}
              onChange={setInput}
              onSubmit={onSubmit}
              editable={!locked}
              micSupported={mic.supported}
              listening={mic.listening}
              onMicPress={onMicPress}
              micError={mic.error}
            />
          )}
        </ScrollView>

        <View style={styles.footer}>
          {feedback ? (
            <FeedbackBanner
              feedback={feedback}
              showListen={ex.canListenCorrect}
              onUpgrade={() => router.push('/premium')}
              onListenCorrect={() => speak(referenceText, accent, rate)}
            />
          ) : null}
          {phase === 'correct' ? (
            <BigButton
              label="Continuar"
              onPress={() => {
                ex.next();
                resetInputs();
              }}
            />
          ) : phase === 'wrong' ? (
            <View style={styles.actions}>
              <BigButton
                label="Tentar de novo"
                tone="danger"
                onPress={() => {
                  ex.retry();
                  if (isRecognize) setSelected(null);
                }}
              />
              {ex.canSkip ? (
                <BigButton
                  label="Pular"
                  tone="ghost"
                  onPress={() => {
                    ex.skip();
                    resetInputs();
                  }}
                />
              ) : null}
            </View>
          ) : (
            <BigButton label={phase === 'checking' ? 'Verificando…' : 'Verificar'} onPress={onSubmit} disabled={!canSubmit} />
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
  instruction: { fontSize: 17, fontWeight: '700', color: colors.text },
  bubble: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md, gap: 4 },
  bubbleEn: { fontSize: 20, fontWeight: '800', color: colors.accentDark },
  thinking: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  bubblePt: { fontSize: 14, color: colors.muted },
  footer: { padding: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actions: { gap: space.xs },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  doneActions: { alignSelf: 'stretch', gap: space.xs },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  doneEmoji: { fontSize: 72 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  doneText: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
