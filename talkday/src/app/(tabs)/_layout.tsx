import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useProgress } from '@/context/ProgressContext';
import { dueItems } from '@/domain/srs';
import { colors } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const icon = (name: IconName) =>
  ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color as string} />;

/** Só as cinco abas principais. Telas de detalhe ficam fora, na pilha da raiz. */
export default function TabsLayout() {
  const { state } = useProgress();
  const due = dueItems(Object.values(state.reviews), Date.now()).length;
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
      <Tabs.Screen name="practice" options={{ title: 'Praticar', tabBarIcon: icon('briefcase') }} />
      <Tabs.Screen name="review" options={{ title: 'Revisão', tabBarIcon: icon('repeat'), tabBarBadge: due > 0 ? due : undefined }} />
      <Tabs.Screen name="progress" options={{ title: 'Progresso', tabBarIcon: icon('trophy') }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
