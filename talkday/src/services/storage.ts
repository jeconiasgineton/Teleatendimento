import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  progress: 'talkday.progress.v1',
  settings: 'talkday.settings.v1',
} as const;

/** Lê JSON salvo; qualquer falha ou formato inesperado vira null (começa do zero). */
export async function loadJSON<T>(key: string, validate: (x: unknown) => x is T): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const data: unknown = JSON.parse(raw);
    return validate(data) ? data : null;
  } catch {
    return null;
  }
}

export async function saveJSON(key: string, value: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Sem espaço/permissão: o app continua funcionando em memória.
  }
}
