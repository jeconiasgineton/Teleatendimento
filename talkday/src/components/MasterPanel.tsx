import { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { createPremiumCode } from '@/services/entitlement';
import { colors, radius, space } from '@/theme';

const OPTIONS = [7, 30, 90, 365];

/** Só para o usuário master: gera códigos premium para repassar a testadores e clientes. */
export function MasterPanel() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ code: string; expiresAt: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = async (days: number) => {
    setBusy(true);
    setError(null);
    try {
      setResult(await createPremiumCode(days));
    } catch {
      setResult(null);
      setError('Não consegui gerar o código. Verifique a internet e o servidor.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Painel master</Text>
      <Text style={styles.text}>Gere um código Premium e envie para quem for testar. Escolha por quantos dias ele vale:</Text>
      <View style={styles.row}>
        {OPTIONS.map((d) => (
          <Pressable key={d} disabled={busy} onPress={() => generate(d)} accessibilityRole="button" style={[styles.chip, busy && { opacity: 0.5 }]}>
            <Text style={styles.chipText}>{d === 365 ? '1 ano' : `${d} dias`}</Text>
          </Pressable>
        ))}
      </View>
      {result ? (
        <View style={styles.result}>
          <Text selectable style={styles.code}>
            {result.code}
          </Text>
          <Text style={styles.text}>Vale até {new Date(result.expiresAt).toLocaleDateString('pt-BR')}.</Text>
          <Pressable onPress={() => Share.share({ message: `Seu código Premium do TalkDay: ${result.code}` })} accessibilityRole="button" style={styles.share}>
            <Text style={styles.shareText}>Compartilhar</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.accentSoft, borderRadius: radius.md, padding: space.md, gap: space.sm },
  title: { fontSize: 16, fontWeight: '800', color: colors.accentDark },
  text: { fontSize: 14, color: colors.text },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: { backgroundColor: colors.bg, borderWidth: 2, borderColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8 },
  chipText: { color: colors.accentDark, fontWeight: '800' },
  result: { gap: space.xs, backgroundColor: colors.bg, borderRadius: radius.sm, padding: space.md },
  code: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: 0.5 },
  share: { alignSelf: 'flex-start', backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: space.md, paddingVertical: 8 },
  shareText: { color: '#fff', fontWeight: '800', textTransform: 'uppercase', fontSize: 13 },
  error: { color: colors.errorDark, fontWeight: '700' },
});
