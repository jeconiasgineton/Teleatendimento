import { useCallback, useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { FeedbackBanner } from '@/components/FeedbackBanner';
import { OptionList } from '@/components/OptionList';
import { PhraseInput } from '@/components/PhraseInput';
import { StepProgress } from '@/components/StepProgress';
import { WordHero } from '@/components/WordHero';
import { useSettings } from '@/context/SettingsContext';
import type { Lesson, Step } from '@/domain/types';
import { useExercise } from '@/hooks/useExercise';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { speak, stopSpeaking } from '@/services/speech';
import { colors, radius, space } from '@/theme';

function heroFor(step: Step) {
  switch (step.kind) {
    case 'recognize':
      return { title: step.word.text, subtitle: undefined, speakText: step.word.text, label: 'Ouvir pronúncia' };
    case 'sentence':
      return { title: step.word.text, subtitle: step.word.pt, speakText: step.word.text, label: 'Ouvir pronúncia' };
    case 'conversation':
      return {
        title: step.lesson.words.map((w) => w.text).join(' · '),
        subtitle: 'Responda usando estas palavras',
        speakText: step.turn.coach,
        label: 'Ouvir pergunta',
      };
  }
}

export function ExerciseScreen({ lesson }: { lesson: Lesson }) {
  const { accent, rate } = useSettings();
  const ex = useExercise(lesson, accent);
  const { step, phase, feedback } = ex;
  const [input, setInput] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const mic = useSpeechInput(accent, (text) => setInput(text));

  // Fala a palavra/pergunta automaticamente quando o passo muda.
  const stepKey = ex.index;
  useEffect(() => {
    if (step) speak(heroFor(step).speakText, accent, rate);
    return () => stopSpeaking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  const resetInputs = useCallback(() => {
    setInput('');
    setSelected(null);
  }, []);

  if (ex.finished) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.done}>
          <Text style={styles.doneEmoji}>🏆</Text>
          <Text style={styles.doneTitle}>Exercício concluído!</Text>
          <Text style={styles.doneText}>
            {ex.missedWords.size === 0
              ? 'Sem nenhum erro. Impecável!'
              : `${ex.missedWords.size} palavra(s) vão para a revisão para você reforçar.`}
          </Text>
          <BigButton
            label="Refazer"
            onPress={() => {
              ex.restart();
              resetInputs();
            }}
          />
        </View>
      </SafeAreaView>
    );
  }
  if (!step) return null;

  const hero = heroFor(step);
  const locked = phase === 'checking' || phase === 'correct';
  const isRecognize = step.kind === 'recognize';
  const canSubmit = !locked && (isRecognize ? selected !== null : input.trim().length > 0);
  const referenceText = step.kind === 'recognize' ? step.word.text : step.kind === 'sentence' ? step.word.example : step.turn.suggestion;

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
          <StepProgress index={ex.index} total={ex.steps.length} kind={step.kind} />
          <WordHero
            title={hero.title}
            subtitle={hero.subtitle}
            listenLabel={hero.label}
            onListen={() => speak(hero.speakText, accent, rate)}
          />

          {step.kind === 'conversation' ? (
            <View style={styles.bubble}>
              <Text style={styles.bubbleEn}>{step.turn.coach}</Text>
              <Text style={styles.bubblePt}>{step.turn.coachPt}</Text>
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
                    ex.next();
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
  bubblePt: { fontSize: 14, color: colors.muted },
  footer: { padding: space.md, gap: space.sm, borderTopWidth: 1, borderTopColor: colors.border },
  actions: { gap: space.xs },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.lg, gap: space.md },
  doneEmoji: { fontSize: 72 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: colors.text },
  doneText: { fontSize: 16, color: colors.muted, textAlign: 'center' },
});
