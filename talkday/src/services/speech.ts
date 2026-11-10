import * as Speech from 'expo-speech';
import type { Accent } from '@/domain/types';

export function speak(text: string, accent: Accent, rate = 0.9): void {
  Speech.stop();
  Speech.speak(text, { language: accent, rate, pitch: 1 });
}

export function stopSpeaking(): void {
  Speech.stop();
}

/** Fala e só resolve quando terminar (ou for interrompida), para encadear trechos. */
export function speakAsync(text: string, language: Accent | 'pt-BR', rate = 0.9): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, { language, rate, pitch: 1, onDone: () => resolve(), onStopped: () => resolve(), onError: () => resolve() });
  });
}
