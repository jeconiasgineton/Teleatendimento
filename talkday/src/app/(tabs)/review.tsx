import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { ReviewSession } from '@/components/ReviewSession';
import { useProgress } from '@/context/ProgressContext';
import { WORDS_BY_ID } from '@/data/lessons';
import { pickKind, type ReviewQuestion } from '@/domain/review';
import { dueItems, formatWait, nextDue } from '@/domain/srs';
import { colors, radius, space } from '@/theme';

const SESSION_SIZE = 10;

export default function Review() {
  const { state, gradeReview } = useProgress();
  const [session, setSession] = useState<ReviewQuestion[] | null>(null);

  const items = Object.values(state.reviews);
  const now = Date.now();
  const due = dueItems(items, now);

  if (session) {
    return <ReviewSession questions={session} onGraded={gradeReview} onExit={() => setSession(null)} />;
  }

  const start = () => {
    const qs: ReviewQuestion[] = due
      .slice(0, SESSION_SIZE)
      .filter((i) => WORDS_BY_ID[i.wordId])
      .map((i) => ({ wordId: i.wordId, word: WORDS_BY_ID[i.wordId], kind: pickKind(i.box, i.lapses) }));
    if (qs.length) setSession(qs);
  };

  const upcoming = nextDue(items, now);
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <Text style={styles.h1}>Revisão</Text>
        {items.length === 0 ? (
          <Card emoji="📚" title="Nada para revisar ainda" text="Conclua a primeira lição e suas palavras aparecem aqui." />
        ) : due.length === 0 ? (
          <Card
            emoji="🌴"
            title="Tudo em dia!"
            text={upcoming ? `A próxima revisão fica pronta em ${formatWait(upcoming - now)}.` : 'Volte mais tarde.'}
          />
        ) : (
          <>
            <Card
              emoji="🔁"
              title={`${due.length} palavra${due.length > 1 ? 's' : ''} para revisar`}
              text="Acertar aumenta o intervalo até a próxima revisão. Errar faz a palavra voltar mais cedo."
            />
            <BigButton label={due.length > SESSION_SIZE ? `Revisar ${SESSION_SIZE} agora` : 'Começar revisão'} onPress={start} />
          </>
        )}
        <Text style={styles.foot}>{items.length} palavra(s) no seu caderno de revisão.</Text>
      </View>
    </SafeAreaView>
  );
}

function Card({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.md, gap: space.md },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, alignItems: 'center', gap: space.sm },
  emoji: { fontSize: 48 },
  cardTitle: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  cardText: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  foot: { color: colors.muted, textAlign: 'center', fontSize: 13 },
});
