import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { IssueType } from '@/domain/types';
import type { Feedback } from '@/hooks/useExercise';
import { colors, radius, space } from '@/theme';

interface Props {
  feedback: Feedback;
  onListenCorrect?: () => void;
  /** Mostra "Ouvir frase correta" (depois de algumas tentativas). */
  showListen: boolean;
  /** Mostra o botão de conhecer o Premium junto do aviso de limite. */
  onUpgrade?: () => void;
}

const ISSUE_LABEL: Record<IssueType, string> = {
  grammar: 'Gramática',
  'word-choice': 'Escolha de palavra',
  context: 'Contexto',
  spelling: 'Escrita',
  naturalness: 'Mais natural',
  'missing-target': 'Palavra da lição',
};

export function FeedbackBanner({ feedback, onListenCorrect, showListen, onUpgrade }: Props) {
  const ok = feedback.correct;
  const tone = ok ? colors.primaryDark : colors.errorDark;
  const issues = feedback.issues ?? [];
  const hasDetails = Boolean(feedback.original) || issues.length > 0 || Boolean(feedback.natural) || Boolean(feedback.notice);

  return (
    <View style={[styles.wrap, ok ? styles.ok : styles.bad]} accessibilityLiveRegion="polite">
      <View style={styles.row}>
        <View style={[styles.badge, { backgroundColor: ok ? colors.primary : colors.error }]}>
          <Ionicons name={ok ? 'checkmark' : 'close'} size={26} color="#fff" />
        </View>
        <Text style={[styles.message, { color: tone }]}>{feedback.message}</Text>
      </View>

      <ScrollView style={hasDetails ? styles.scroll : undefined} nestedScrollEnabled>
        <View style={styles.details}>
          {feedback.original ? (
            <Text style={[styles.line, { color: tone }]}>
              Você disse: <Text style={styles.quote}>“{feedback.original}”</Text>
            </Text>
          ) : null}

          {feedback.corrected ? (
            <Text style={[styles.line, { color: tone }]}>
              {ok ? 'Sua frase: ' : 'Forma correta: '}
              <Text style={styles.bold}>{feedback.corrected}</Text>
            </Text>
          ) : null}

          {!ok && feedback.explanationPt ? <Text style={[styles.explain, { color: tone }]}>{feedback.explanationPt}</Text> : null}

          {issues.length > 0 ? (
            <View style={styles.issues}>
              {issues.map((i, n) => (
                <View key={`${i.type}-${n}`} style={styles.issue}>
                  <Text style={[styles.tag, { color: tone }]}>{ISSUE_LABEL[i.type]}</Text>
                  {i.original || i.fix ? (
                    <Text style={[styles.fix, { color: tone }]}>
                      {i.original ? <Text style={styles.strike}>{i.original}</Text> : null}
                      {i.original && i.fix ? '  →  ' : ''}
                      {i.fix ? <Text style={styles.bold}>{i.fix}</Text> : null}
                    </Text>
                  ) : null}
                  <Text style={[styles.why, { color: tone }]}>{i.explanationPt}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {feedback.natural ? (
            <Text style={[styles.line, { color: tone }]}>
              💡 Mais natural: <Text style={styles.bold}>{feedback.natural}</Text>
            </Text>
          ) : null}

          {ok && feedback.reply ? (
            <Text style={styles.reply}>
              Coach: <Text style={styles.bold}>{feedback.reply.en}</Text>
              {feedback.reply.pt ? ` (${feedback.reply.pt})` : ''}
            </Text>
          ) : null}

          {feedback.notice ? <Text style={styles.notice}>{feedback.notice}</Text> : null}
        </View>
      </ScrollView>

      {feedback.notice && onUpgrade ? (
        <Pressable onPress={onUpgrade} accessibilityRole="button" style={styles.upgrade}>
          <Text style={styles.upgradeText}>Conhecer o Premium</Text>
        </Pressable>
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
  scroll: { maxHeight: 230 },
  details: { gap: space.sm },
  line: { fontSize: 16 },
  quote: { fontStyle: 'italic' },
  bold: { fontWeight: '800' },
  explain: { fontSize: 15 },
  issues: { gap: space.sm },
  issue: { backgroundColor: 'rgba(255,255,255,0.65)', borderRadius: radius.sm, padding: space.sm, gap: 2 },
  tag: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  fix: { fontSize: 15 },
  strike: { textDecorationLine: 'line-through' },
  why: { fontSize: 14 },
  reply: { fontSize: 15, color: colors.primaryDark },
  notice: { fontSize: 13, fontStyle: 'italic', color: colors.muted },
  upgrade: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8 },
  upgradeText: { color: '#fff', fontWeight: '800', fontSize: 13, textTransform: 'uppercase' },
  listen: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingVertical: 4 },
  listenText: { color: colors.errorDark, fontWeight: '800', textTransform: 'uppercase', fontSize: 13 },
});
