import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, space } from '@/theme';

interface Props {
  value: string;
  onChange: (t: string) => void;
  onSubmit: () => void;
  editable: boolean;
  micSupported: boolean;
  listening: boolean;
  onMicPress: () => void;
  micError?: string | null;
}

export function PhraseInput({ value, onChange, onSubmit, editable, micSupported, listening, onMicPress, micError }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.field, listening && styles.fieldActive]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSubmit}
          editable={editable}
          placeholder={listening ? 'Estou ouvindo…' : 'Fale ou digite sua frase em inglês'}
          placeholderTextColor={colors.locked}
          autoCapitalize="sentences"
          autoCorrect={false}
          multiline
          returnKeyType="done"
          blurOnSubmit
          accessibilityLabel="Sua frase em inglês"
        />
        {micSupported ? (
          <Pressable
            onPress={onMicPress}
            disabled={!editable}
            accessibilityRole="button"
            accessibilityLabel={listening ? 'Parar de gravar' : 'Falar a frase'}
            style={[styles.mic, listening && styles.micActive]}
          >
            <Ionicons name={listening ? 'stop' : 'mic'} size={26} color="#fff" />
          </Pressable>
        ) : null}
      </View>
      {!micSupported ? (
        <Text style={styles.hint}>Voz indisponível neste ambiente (use um development build). Você pode digitar.</Text>
      ) : null}
      {micError ? <Text style={styles.error}>{micError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: space.sm,
    minHeight: 84,
  },
  fieldActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  input: { flex: 1, fontSize: 20, color: colors.text, paddingHorizontal: space.sm, paddingVertical: space.sm },
  mic: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 4,
    borderBottomColor: colors.accentDark,
  },
  micActive: { backgroundColor: colors.error, borderBottomColor: colors.errorDark },
  hint: { color: colors.muted, fontSize: 13 },
  error: { color: colors.errorDark, fontSize: 13, fontWeight: '600' },
});
