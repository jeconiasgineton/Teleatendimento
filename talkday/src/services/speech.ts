import * as Speech from 'expo-speech';
import type { Accent } from '@/domain/types';

export function speak(text: string, accent: Accent, rate = 0.9): void {
  Speech.stop();
  Speech.speak(text, { language: accent, rate, pitch: 1 });
}

export function stopSpeaking(): void {
  Speech.stop();
}
