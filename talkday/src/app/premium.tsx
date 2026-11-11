import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { useEntitlement } from '@/context/EntitlementContext';
import { FREE_DAILY_LIMIT, PLAN_LABEL } from '@/domain/plan';
import { UPGRADE_URL } from '@/services/config';
import { colors, radius, space } from '@/theme';

const BENEFITS = [
  'Conversa livre por voz com a Sam, sem botões',
  'Falando nas reuniões: 4 cenários com perguntas geradas pela IA',
  'Perguntas da mini conversa criadas pela IA em cada lição',
  `Correção completa por IA sem limite (o plano Grátis tem ${FREE_DAILY_LIMIT} por dia)`,
];

const ERRORS: Record<string, string> = {
  invalid: 'Código inválido, vencido ou já desativado. Confira se digitou certinho.',
  network: 'Não consegui falar com o servidor. Verifique a internet e tente de novo.',
  unconfigured: 'O servidor ainda não está configurado para ativar códigos.',
  too_many: 'Muitas tentativas hoje. Tente de novo amanhã.',
};

export default function Premium() {
  const router = useRouter();
  const { plan, redeem, signOut } = useEntitlement();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const activate = async () => {
    setBusy(true);
    setMessage(null);
    const r = await redeem(code);
    setBusy(false);
    if (r.ok) {
      setCode('');
      setMessage({ ok: true, text: r.stored.plan === 'master' ? 'Acesso master ativado. Tudo liberado!' : 'Premium ativado. Aproveite! 🎉' });
    } else {
      setMessage({ ok: false, text: ERRORS[r.reason] ?? ERRORS.network });
    }
  };

  const paid = plan !== 'free';
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.muted} />
        </Pressable>
        <Text style={styles.emoji}>⭐</Text>
        <Text style={styles.h1}>TalkDay Premium</Text>
        <Text style={styles.sub}>
          Seu plano: <Text style={styles.bold}>{PLAN_LABEL[plan]}</Text>
        </Text>

        <View style={styles.card}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefit}>
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
              <Text style={styles.benefitText}>{b}</Text>
            </View>
          ))}
        </View>

        {!paid ? (
          <>
            <Text style={styles.h2}>Tenho um código</Text>
            <TextInput
              style={styles.input}
              value={code}
              onChangeText={setCode}
              placeholder="TD-XXXXXX-AAAAMMDD-XXXXXXXXXX"
              placeholderTextColor={colors.locked}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!busy}
              accessibilityLabel="Código de ativação"
            />
            <BigButton label={busy ? 'Verificando…' : 'Ativar'} onPress={activate} disabled={busy || code.trim().length < 4} />

            <Text style={styles.h2}>Quero assinar</Text>
            {UPGRADE_URL ? (
              <BigButton label="Assinar o Premium" tone="ghost" onPress={() => Linking.openURL(UPGRADE_URL!)} />
            ) : (
              <Text style={styles.note}>A assinatura paga ainda não está disponível. Se você recebeu um código, ative-o acima.</Text>
            )}
          </>
        ) : (
          <BigButton label="Sair do plano neste aparelho" tone="ghost" onPress={signOut} />
        )}

        {message ? <Text style={[styles.msg, { color: message.ok ? colors.primaryDark : colors.errorDark }]}>{message.text}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.md, gap: space.md },
  emoji: { fontSize: 56, textAlign: 'center' },
  h1: { fontSize: 28, fontWeight: '800', color: colors.text, textAlign: 'center' },
  sub: { fontSize: 15, color: colors.muted, textAlign: 'center' },
  bold: { fontWeight: '800', color: colors.text },
  h2: { fontSize: 14, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', marginTop: space.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: space.md, gap: space.sm },
  benefit: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  benefitText: { flex: 1, fontSize: 15, color: colors.text },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: space.md, fontSize: 16, color: colors.text, backgroundColor: colors.surface },
  note: { fontSize: 14, color: colors.muted },
  msg: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
});
