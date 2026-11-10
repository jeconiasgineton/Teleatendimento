import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { Animated, AppState, Easing, ScrollView, StyleSheet, Text, View, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { WORDS_BY_ID } from '@/data/lessons';
import { recentWords } from '@/domain/chat';
import { useVoiceConversation, type TalkProblem, type TalkState } from '@/hooks/useVoiceConversation';
import { usingRealAI } from '@/services/ai';
import { recognitionSupported } from '@/services/speechRecognition';
import { colors, radius, space } from '@/theme';

const STATUS: Record<TalkState, { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  idle: { label: 'Pronto', color: colors.locked, icon: 'chatbubbles' },
  thinking: { label: 'Pensando…', color: colors.accentDark, icon: 'ellipsis-horizontal' },
  speaking: { label: 'Sam está falando…', color: colors.accent, icon: 'volume-high' },
  listening: { label: 'Sua vez! Pode falar.', color: colors.primary, icon: 'mic' },
  ended: { label: 'Conversa encerrada', color: colors.locked, icon: 'checkmark' },
};

const PROBLEMS: Record<Exclude<TalkProblem, null>, string> = {
  'no-ai': 'A conversa livre precisa da IA. Configure a URL do proxy (AI_PROXY_URL) e gere o app de novo.',
  'no-mic-support': 'O reconhecimento de voz não funciona neste ambiente. Use o app instalado (development build ou APK).',
  denied: 'Sem permissão para o microfone. Libere nas configurações do aparelho e tente de novo.',
  failed: 'Não consegui falar com a IA agora. Verifique a internet e tente de novo.',
};

/** Círculo que pulsa enquanto alguém fala ou escuta. */
function Orb({ state }: { state: TalkState }) {
  const scale = useRef(new Animated.Value(1)).current;
  const active = state === 'speaking' || state === 'listening' || state === 'thinking';

  useEffect(() => {
    if (!active) {
      scale.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: state === 'thinking' ? 1.06 : 1.18, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, state, scale]);

  const s = STATUS[state];
  return (
    <View style={styles.orbWrap} accessibilityLabel={s.label} accessibilityLiveRegion="polite">
      <Animated.View style={[styles.orb, { backgroundColor: s.color, transform: [{ scale }] }]}>
        <Ionicons name={s.icon} size={44} color="#fff" />
      </Animated.View>
      <Text style={[styles.status, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export default function Talk() {
  const router = useRouter();
  const { accent, rate } = useSettings();
  const { state: progress } = useProgress();
  const words = useMemo(() => recentWords(progress.learned, WORDS_BY_ID), [progress.learned]);
  const talk = useVoiceConversation({ accent, rate, words });
  const scroll = useRef<ScrollViewInstance>(null);

  // Ao sair da tela ou ir para o segundo plano, para de falar e de escutar.
  const { stop } = talk;
  useFocusEffect(useCallback(() => () => stop(), [stop]));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s !== 'active' && stop());
    return () => sub.remove();
  }, [stop]);

  useEffect(() => {
    const t = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(t);
  }, [talk.lines.length, talk.live]);

  const running = talk.state !== 'idle' && talk.state !== 'ended';
  const blocked = !usingRealAI ? 'no-ai' : !recognitionSupported ? 'no-mic-support' : talk.problem;

  if (!running) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.intro}>
          <Text style={styles.emoji}>{talk.state === 'ended' ? '👋' : '🗣️'}</Text>
          <Text style={styles.h1}>{talk.state === 'ended' ? 'Conversa encerrada' : 'Conversa livre com a Sam'}</Text>
          {talk.state === 'ended' && talk.lines.length > 0 ? (
            <Text style={styles.text}>Você falou {talk.lines.filter((l) => l.role === 'user').length} vez(es). Ótimo trabalho!</Text>
          ) : (
            <>
              <Text style={styles.text}>Toque em começar uma única vez. Depois é só conversar: a Sam fala, você responde, ela escuta e continua. Sem apertar mais nada.</Text>
              <View style={styles.tips}>
                <Text style={styles.tip}>🇺🇸 Pode falar em inglês.</Text>
                <Text style={styles.tip}>🇧🇷 Não entendeu? Fale em português que a Sam ajuda.</Text>
                <Text style={styles.tip}>🎧 Use fones de ouvido para evitar eco.</Text>
                <Text style={styles.tip}>👋 Para terminar, diga "goodbye" ou "tchau".</Text>
              </View>
            </>
          )}
          {blocked ? <Text style={styles.problem}>{PROBLEMS[blocked]}</Text> : null}
          <View style={styles.full}>
            <BigButton
              label={talk.state === 'ended' ? 'Conversar de novo' : 'Começar conversa'}
              onPress={talk.start}
              disabled={!usingRealAI || !recognitionSupported}
            />
            <BigButton label="Voltar" tone="ghost" onPress={() => router.navigate('/practice')} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <Orb state={talk.state} />
        <View style={styles.chip}>
          <Ionicons name="mic" size={14} color={colors.accentDark} />
          <Text style={styles.chipText}>Ouvindo em: {talk.listenLang === 'pt' ? 'português' : 'inglês'}</Text>
        </View>
      </View>

      <ScrollView ref={scroll} style={styles.log} contentContainerStyle={styles.logContent}>
        {talk.lines.map((l) => (
          <View key={l.id} style={[styles.bubble, l.role === 'ai' ? styles.ai : styles.user]}>
            {l.lang === 'pt' ? <Text style={[styles.tag, l.role === 'user' && { color: '#fff' }]}>PT</Text> : null}
            <Text style={[styles.bubbleText, l.role === 'user' && { color: '#fff' }]}>{l.text}</Text>
          </View>
        ))}
        {talk.live ? (
          <View style={[styles.bubble, styles.user, styles.live]}>
            <Text style={[styles.bubbleText, { color: colors.accentDark, fontStyle: 'italic' }]}>{talk.live}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.footer}>
        <BigButton label="Encerrar conversa" tone="danger" onPress={talk.stop} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  intro: { padding: space.lg, gap: space.md, alignItems: 'center', flexGrow: 1, justifyContent: 'center' },
  emoji: { fontSize: 72 },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  text: { fontSize: 16, color: colors.muted, textAlign: 'center' },
  tips: { alignSelf: 'stretch', backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: space.sm },
  tip: { fontSize: 15, color: colors.text },
  problem: { color: colors.errorDark, fontWeight: '700', textAlign: 'center' },
  full: { alignSelf: 'stretch', gap: space.xs, marginTop: space.sm },
  top: { alignItems: 'center', paddingTop: space.md, gap: space.sm },
  orbWrap: { alignItems: 'center', gap: space.sm, paddingVertical: space.md },
  orb: { width: 110, height: 110, borderRadius: 55, alignItems: 'center', justifyContent: 'center' },
  status: { fontSize: 18, fontWeight: '800' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: colors.accentDark, fontWeight: '700', fontSize: 13 },
  log: { flex: 1 },
  logContent: { padding: space.md, gap: space.sm },
  bubble: { maxWidth: '85%', borderRadius: radius.md, padding: space.md, gap: 2 },
  ai: { alignSelf: 'flex-start', backgroundColor: colors.surface },
  user: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  live: { backgroundColor: colors.accentSoft },
  bubbleText: { fontSize: 17, color: colors.text },
  tag: { fontSize: 11, fontWeight: '800', color: colors.accentDark },
  footer: { padding: space.md, borderTopWidth: 1, borderTopColor: colors.border },
});
