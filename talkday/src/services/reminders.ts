import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

const REMINDER_ID = 'talkday-daily-reminder';
const HOUR = 19;
const MINUTE = 0;

/**
 * Liga ou desliga o lembrete diário (19:00). Devolve false se o aluno não
 * deu permissão ou se o ambiente não suporta notificações (ex.: web).
 */
export async function syncReminder(enabled: boolean): Promise<boolean> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    if (!enabled) return true;

    const current = await Notifications.getPermissionsAsync();
    const perm = current.granted ? current : await Notifications.requestPermissionsAsync();
    if (!perm.granted) return false;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('reminders', {
        name: 'Lembretes de estudo',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: {
        title: 'Hora de praticar inglês! 🎯',
        body: 'Cinco minutinhos hoje valem mais que uma hora no fim de semana.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: HOUR,
        minute: MINUTE,
        channelId: 'reminders',
      },
    });
    return true;
  } catch {
    return false;
  }
}
