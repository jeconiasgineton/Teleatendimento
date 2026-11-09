import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SettingsProvider } from '@/context/SettingsContext';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color as string} />;

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primaryDark,
          tabBarInactiveTintColor: colors.locked,
          tabBarLabelStyle: { fontWeight: '700' },
        }}
      >
        <Tabs.Screen name="index" options={{ title: 'Exercício', tabBarIcon: icon('school') }} />
        <Tabs.Screen name="review" options={{ title: 'Revisão', tabBarIcon: icon('repeat') }} />
        <Tabs.Screen name="progress" options={{ title: 'Progresso', tabBarIcon: icon('trophy') }} />
        <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('settings') }} />
      </Tabs>
    </SettingsProvider>
  );
}
