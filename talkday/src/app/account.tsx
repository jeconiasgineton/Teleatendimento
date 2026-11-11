import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BigButton } from '@/components/BigButton';
import { useAccount } from '@/context/AccountContext';
import { useProgress } from '@/context/ProgressContext';
import { normalizeEmail, normalizePhone, passwordProblem } from '@/domain/contact';
import { isEmptyProgress } from '@/domain/sync';
import type { AccountError } from '@/services/account';
import { colors, radius, space } from '@/theme';

const MESSAGES: Record<AccountError, string> = {
  invalid_email: 'Esse e-mail não parece válido.',
  invalid_phone: 'Esse celular não parece válido. Use DDD + número, ou +código do país.',
  weak_password: 'Escolha uma senha mais forte (8 caracteres ou mais, sem repetição).',
  invalid_credentials: 'E-mail, celular ou senha incorretos. Confira os três.',
  account_exists: 'Já existe uma conta com este e-mail e celular. Toque em "Entrar".',
  locked: 'Muitas tentativas erradas. Tente de novo mais tarde.',
  too_many_attempts: 'Muitas tentativas por aqui hoje. Tente de novo amanhã.',
  invalid_data: 'Não consegui enviar o histórico deste aparelho. Tente de novo.',
  unconfigured: 'As contas ainda não estão ativadas no servidor.',
  session_invalid: 'Sua sessão expirou. Entre de novo.',
  network: 'Não consegui falar com o servidor. Verifique a internet e tente de novo.',
  server: 'Algo deu errado no servidor. Tente de novo em instantes.',
};

const SYNC_LABEL = { idle: 'Tudo salvo na nuvem', syncing: 'Sincronizando…', error: 'Sem conexão. Tentarei de novo.', expired: 'Sessão expirada. Entre de novo.' } as const;

export default function Account() {
  const router = useRouter();
  const account = useAccount();
  const { state } = useProgress();
  const [mode, setMode] = useState<'signup' | 'login'>('signup');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [understood, setUnderstood] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signup = mode === 'signup';
  const hasLocal = !isEmptyProgress(state);

  const submit = async () => {
    setError(null);
    const e = normalizeEmail(email);
    const p = normalizePhone(phone);
    if (!e) return setError(MESSAGES.invalid_email);
    if (!p) return setError(MESSAGES.invalid_phone);
    if (signup) {
      const problem = passwordProblem(password, e);
      if (problem) return setError(problem);
      if (password !== confirm) return setError('As duas senhas não são iguais.');
      if (!understood) return setError('Confirme que entendeu que não há recuperação de senha.');
    } else if (!password) {
      return setError('Digite a senha.');
    }

    const run = async () => {
      setBusy(true);
      const r = signup ? await account.signUp(email, phone, password) : await account.logIn(email, phone, password);
      setBusy(false);
      if (!r.ok) {
        const wait = r.error === 'locked' && r.retryAfterMs ? ` Tente de novo em ${Math.ceil(r.retryAfterMs / 60000)} min.` : '';
        return setError(`${MESSAGES[r.error]}${r.error === 'locked' ? wait : ''}`);
      }
      setPassword('');
      setConfirm('');
      router.back();
    };

    if (!signup && hasLocal) {
      Alert.alert('Entrar nesta conta?', 'O progresso deste aparelho será substituído pelo histórico da conta. Isso não pode ser desfeito.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Entrar', onPress: run },
      ]);
    } else {
      await run();
    }
  };

  const confirmLogout = () =>
    Alert.alert('Sair da conta?', 'Seu histórico fica salvo na conta. Neste aparelho você volta ao início, como convidado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => account.logOut().then(() => router.back()) },
    ]);

  const showForms = !account.signedIn || account.sync === 'expired';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" hitSlop={12}>
          <Ionicons name="arrow-back" size={26} color={colors.muted} />
        </Pressable>

        {account.signedIn ? (
          <View style={styles.card}>
            <Text style={styles.emoji}>☁️</Text>
            <Text style={styles.h1}>Minha conta</Text>
            <Text style={styles.line}>E-mail: <Text style={styles.bold}>{account.emailHint}</Text></Text>
            <Text style={styles.line}>Celular: <Text style={styles.bold}>{account.phoneHint}</Text></Text>
            <Text style={[styles.status, account.sync === 'expired' || account.sync === 'error' ? { color: colors.errorDark } : null]}>{SYNC_LABEL[account.sync]}</Text>
            {account.sync !== 'expired' ? <BigButton label="Sincronizar agora" tone="ghost" onPress={() => void account.syncNow()} /> : null}
            <BigButton label="Sair da conta" tone="danger" onPress={confirmLogout} />
          </View>
        ) : null}

        {showForms ? (
          <>
            {!account.signedIn ? (
              <>
                <Text style={styles.emoji}>🔐</Text>
                <Text style={styles.h1}>{signup ? 'Criar conta' : 'Entrar'}</Text>
                <Text style={styles.sub}>
                  Seu e-mail e celular formam a sua chave. Em qualquer aparelho, com os mesmos dados e a senha, você recupera o histórico. Com dados diferentes, começa do zero.
                </Text>
                <View style={styles.tabs}>
                  {(['signup', 'login'] as const).map((m) => (
                    <Pressable key={m} onPress={() => { setMode(m); setError(null); }} accessibilityRole="tab" accessibilityState={{ selected: mode === m }} style={[styles.tab, mode === m && styles.tabOn]}>
                      <Text style={[styles.tabText, mode === m && styles.tabTextOn]}>{m === 'signup' ? 'Criar conta' : 'Entrar'}</Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.h2}>Entrar de novo</Text>
            )}

            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="E-mail" placeholderTextColor={colors.locked} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!busy} accessibilityLabel="E-mail" />
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Celular com DDD" placeholderTextColor={colors.locked} keyboardType="phone-pad" autoComplete="tel" editable={!busy} accessibilityLabel="Celular" />
            <TextInput style={styles.input} value={password} onChangeText={setPassword} placeholder="Senha" placeholderTextColor={colors.locked} secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={signup ? 'new-password' : 'current-password'} editable={!busy} accessibilityLabel="Senha" />
            {signup ? (
              <>
                <TextInput style={styles.input} value={confirm} onChangeText={setConfirm} placeholder="Repita a senha" placeholderTextColor={colors.locked} secureTextEntry autoCapitalize="none" autoCorrect={false} editable={!busy} accessibilityLabel="Repita a senha" />
                {hasLocal ? <Text style={styles.note}>✅ O progresso que você já fez neste aparelho será salvo nesta conta.</Text> : null}
                <View style={styles.warn}>
                  <Switch value={understood} onValueChange={setUnderstood} trackColor={{ true: colors.primary, false: colors.border }} accessibilityLabel="Entendi que não há recuperação de senha" />
                  <Text style={styles.warnText}>Entendo que, se eu esquecer a senha, não há como recuperá-la nem acessar o histórico.</Text>
                </View>
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}
            <BigButton label={busy ? 'Aguarde…' : signup ? 'Criar conta' : 'Entrar'} onPress={submit} disabled={busy} />
            {!account.signedIn ? <Text style={styles.note}>Sem conta, você continua usando o app normalmente, com o progresso só neste aparelho.</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  body: { padding: space.md, gap: space.md },
  emoji: { fontSize: 52, textAlign: 'center' },
  h1: { fontSize: 26, fontWeight: '800', color: colors.text, textAlign: 'center' },
  h2: { fontSize: 18, fontWeight: '800', color: colors.text },
  sub: { fontSize: 14, color: colors.muted, textAlign: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  line: { fontSize: 16, color: colors.text },
  bold: { fontWeight: '800' },
  status: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  tabs: { flexDirection: 'row', backgroundColor: colors.surface, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm },
  tabOn: { backgroundColor: colors.bg },
  tabText: { fontWeight: '700', color: colors.muted },
  tabTextOn: { color: colors.text },
  input: { borderWidth: 2, borderColor: colors.border, borderRadius: radius.md, padding: space.md, fontSize: 16, color: colors.text, backgroundColor: colors.surface },
  warn: { flexDirection: 'row', alignItems: 'center', gap: space.sm, backgroundColor: '#FFF3C4', borderRadius: radius.md, padding: space.md },
  warnText: { flex: 1, fontSize: 13, color: '#8A6100', fontWeight: '600' },
  note: { fontSize: 13, color: colors.muted, textAlign: 'center' },
  error: { color: colors.errorDark, fontWeight: '700', textAlign: 'center' },
});
