import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { AccountProvider, useAccount } from '@/context/AccountContext';
import { EntitlementProvider, useEntitlement } from '@/context/EntitlementContext';
import { ProgressProvider, useProgress } from '@/context/ProgressContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { colors } from '@/theme';

/** Espera tudo carregar do aparelho antes de mostrar qualquer tela. */
function Gate() {
  const settings = useSettings();
  const progress = useProgress();
  const entitlement = useEntitlement();
  const account = useAccount();
  if (!settings.loaded || !progress.loaded || !entitlement.loaded || !account.loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      {/* As abas ficam em (tabs); as telas abaixo abrem por cima delas e o "voltar" retorna à aba de origem. */}
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="account" />
      <Stack.Screen name="talk" />
      <Stack.Screen name="lesson/[id]" />
      <Stack.Screen name="pack/[kind]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <EntitlementProvider>
        <ProgressProvider>
          <AccountProvider>
            <StatusBar style="dark" />
            <Gate />
          </AccountProvider>
        </ProgressProvider>
      </EntitlementProvider>
    </SettingsProvider>
  );
}
