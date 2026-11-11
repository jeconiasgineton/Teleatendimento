import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MasterPanel } from '@/components/MasterPanel';
import { useAccount } from '@/context/AccountContext';
import { useEntitlement } from '@/context/EntitlementContext';
import { useProgress } from '@/context/ProgressContext';
import { useSettings } from '@/context/SettingsContext';
import { PLAN_LABEL } from '@/domain/plan';
import type { Accent } from '@/domain/types';
import { speak } from '@/services/speech';
import { colors, radius, space } from '@/theme';

const ACCENTS: { value: Accent; label: string }[] = [
  { value: 'en-US', label: 'Americano (en-US)' },
  { value: 'en-GB', label: 'Britânico (en-GB)' },
];

export default function Settings() {
  const { accent, setAccent, rate, setRate, reminder, setReminder } = useSettings();
  const { reset } = useProgress();
  const router = useRouter();
  const { plan, usage } = useEntitlement();
  const account = useAccount();
  const [busy, setBusy] = useState(false);

  const toggleReminder = async (on: boolean) => {
    setBusy(true);
    const ok = await setReminder(on);
    setBusy(false);
    if (!ok) Alert.alert('Lembrete indisponível', 'Permita as notificações nas configurações do aparelho para receber o lembrete diário.');
  };

  const confirmReset = () =>
    Alert.alert('Apagar progresso?', 'Isso apaga lições concluídas, palavras aprendidas e revisões. Não dá para desfazer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: reset },
    ]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.h1}>Ajustes</Text>

        <Text style={styles.h2}>Minha conta</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/account')} style={[styles.option, styles.planRow]}>
          <View style={styles.planText}>
            <Text style={styles.optionText}>{account.signedIn ? account.emailHint : 'Modo convidado'}</Text>
            <Text style={styles.note}>
              {account.signedIn
                ? account.sync === 'expired'
                  ? 'Sessão expirada. Entre de novo.'
                  : 'Seu histórico está salvo na nuvem'
                : 'Progresso só neste aparelho'}
            </Text>
          </View>
          <Text style={styles.link}>{account.signedIn ? 'Gerenciar' : 'Criar conta / Entrar'}</Text>
        </Pressable>

        <Text style={styles.h2}>Meu plano</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push('/premium')} style={[styles.option, styles.planRow]}>
          <View style={styles.planText}>
            <Text style={styles.optionText}>{PLAN_LABEL[plan]}</Text>
            {plan === 'free' && usage ? (
              <Text style={styles.note}>
                {usage.used} de {usage.limit} correções por IA usadas hoje
              </Text>
            ) : null}
          </View>
          <Text style={styles.link}>{plan === 'free' ? 'Ver Premium' : 'Gerenciar'}</Text>
        </Pressable>
        {plan === 'master' ? <MasterPanel /> : null}

        <Text style={styles.h2}>Sotaque do inglês</Text>
        {ACCENTS.map((a) => (
          <Pressable
            key={a.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: accent === a.value }}
            onPress={() => {
              setAccent(a.value);
              speak('Hello! Let us practice.', a.value, rate);
            }}
            style={[styles.option, accent === a.value && styles.selected]}
          >
            <Text style={styles.optionText}>{a.label}</Text>
          </Pressable>
        ))}

        <Text style={styles.h2}>Velocidade da voz</Text>
        <View style={styles.row}>
          {[0.7, 0.9, 1.1].map((r) => (
            <Pressable
              key={r}
              accessibilityRole="radio"
              accessibilityState={{ selected: rate === r }}
              onPress={() => {
                setRate(r);
                speak('Hello! Let us practice.', accent, r);
              }}
              style={[styles.option, styles.flex, rate === r && styles.selected]}
            >
              <Text style={styles.optionText}>{r === 0.7 ? 'Lenta' : r === 0.9 ? 'Normal' : 'Rápida'}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.h2}>Lembrete</Text>
        <View style={[styles.option, styles.switchRow]}>
          <Text style={styles.optionText}>Lembrar de praticar todo dia às 19h</Text>
          <Switch
            value={reminder}
            disabled={busy}
            onValueChange={toggleReminder}
            trackColor={{ true: colors.primary, false: colors.border }}
            accessibilityLabel="Lembrete diário"
          />
        </View>

        <Text style={styles.h2}>Dados</Text>
        <Pressable accessibilityRole="button" onPress={confirmReset} style={[styles.option, styles.danger]}>
          <Text style={[styles.optionText, { color: colors.errorDark }]}>Apagar meu progresso</Text>
        </Pressable>
        <Text style={styles.note}>{account.signedIn ? 'Apagar também apaga o histórico da sua conta.' : 'Seu progresso fica só neste aparelho.'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.md, gap: space.sm },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: space.sm },
  h2: { fontSize: 14, fontWeight: '800', color: colors.muted, textTransform: 'uppercase', marginTop: space.md },
  row: { flexDirection: 'row', gap: space.sm },
  flex: { flex: 1 },
  option: { borderWidth: 2, borderBottomWidth: 4, borderColor: colors.border, borderRadius: radius.md, padding: space.md, alignItems: 'center' },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  planRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md },
  planText: { flexShrink: 1, gap: 2 },
  link: { color: colors.accentDark, fontWeight: '800' },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md },
  danger: { borderColor: colors.errorSoft },
  optionText: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  note: { color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: space.sm },
});
