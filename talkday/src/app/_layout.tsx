import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, type ColorValue } from 'react-native';
import { ProgressProvider, useProgress } from '@/context/ProgressContext';
import { SettingsProvider, useSettings } from '@/context/SettingsContext';
import { dueItems } from '@/domain/srs';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color as string} />;

function Shell() {
  const settings = useSettings();
  const progress = useProgress();

  if (!settings.loaded || !progress.loaded) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  const due = dueItems(Object.values(progress.state.reviews), Date.now()).length;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.locked,
        tabBarLabelStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Exercício', tabBarIcon: icon('school') }} />
      <Tabs.Screen
        name="review"
        options={{ title: 'Revisão', tabBarIcon: icon('repeat'), tabBarBadge: due > 0 ? due : undefined }}
      />
      <Tabs.Screen name="progress" options={{ title: 'Progresso', tabBarIcon: icon('trophy') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('settings') }} />
      <Tabs.Screen name="lesson/[id]" options={{ href: null }} />
    </Tabs>
  );
}

export default function RootLayout() {
  return (
    <SettingsProvider>
      <ProgressProvider>
        <StatusBar style="dark" />
        <Shell />
      </ProgressProvider>
    </SettingsProvider>
  );
}
