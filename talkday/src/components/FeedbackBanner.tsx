import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Feedback } from '@/hooks/useExercise';
import { colors, radius, space } from '@/theme';

interface Props {
  feedback: Feedback;
  onListenCorrect?: () => void;
  /** Mostra "Ouvir frase correta" (depois de algumas tentativas). */
  showListen: boolean;
}

export function FeedbackBanner({ feedback, onListenCorrect, showListen }: Props) {
  const ok = feedback.correct;
  return (
    <View
      style={[styles.wrap, ok ? styles.ok : styles.bad]}
      accessibilityLiveRegion="polite"
    >
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: ok ? colors.primary : colors.error }]}>
          <Ionicons name={ok ? 'checkmark' : 'close'} size={26} color="#fff" />
        </View>
        <Text style={[styles.message, { color: ok ? colors.primaryDark : colors.errorDark }]}>{feedback.message}</Text>
      </View>
      {feedback.corrected ? (
        <Text style={[styles.correct, { color: ok ? colors.primaryDark : colors.errorDark }]}>
          {ok ? 'Sua frase: ' : 'Forma correta: '}
          <Text style={styles.bold}>{feedback.corrected}</Text>
        </Text>
      ) : null}
      {ok && feedback.reply ? (
        <Text style={styles.reply}>
          Coach: <Text style={styles.bold}>{feedback.reply.en}</Text>
          {feedback.reply.pt ? ` (${feedback.reply.pt})` : ''}
        </Text>
      ) : null}
      {!ok && feedback.explanationPt ? (
        <Text style={[styles.explain, { color: colors.errorDark }]}>{feedback.explanationPt}</Text>
      ) : null}
      {!ok && showListen && onListenCorrect ? (
        <Pressable onPress={onListenCorrect} accessibilityRole="button" style={styles.listen}>
          <Ionicons name="volume-high" size={18} color={colors.errorDark} />
          <Text style={styles.listenText}>Ouvir frase correta</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, padding: space.md, gap: space.sm },
  ok: { backgroundColor: colors.primarySoft },
  bad: { backgroundColor: colors.errorSoft },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, fontSize: 18, fontWeight: '800' },
  correct: { fontSize: 16 },
  bold: { fontWeight: '800' },
  reply: { fontSize: 15, color: colors.primaryDark },
  explain: { fontSize: 15 },
  listen: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4 },
  listenText: { color: colors.errorDark, fontWeight: '800', textTransform: 'uppercase', fontSize: 13 },
});
