import { useCallback, useState } from 'react';
import type { Accent } from '@/domain/types';
import { recognitionSupported, speechRecognition } from '@/services/speechRecognition';

// Constante de módulo: a ordem dos hooks nunca muda entre renders.
const useRecognitionEvent = (speechRecognition?.useSpeechRecognitionEvent ??
  (() => {})) as (name: string, cb: (e: any) => void) => void;

export function useSpeechInput(accent: Accent, onText: (text: string, isFinal: boolean) => void) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useRecognitionEvent('start', () => setListening(true));
  useRecognitionEvent('end', () => setListening(false));
  useRecognitionEvent('result', (e) => {
    const text = e?.results?.[0]?.transcript;
    if (typeof text === 'string') onText(text, !!e.isFinal);
  });
  useRecognitionEvent('error', (e) => {
    setListening(false);
    setError(e?.error === 'not-allowed' ? 'Permita o microfone nas configurações.' : 'Não consegui ouvir. Tente de novo ou digite.');
  });

  const start = useCallback(async () => {
    if (!speechRecognition) return;
    setError(null);
    const mod = speechRecognition.ExpoSpeechRecognitionModule;
    const perm = await mod.requestPermissionsAsync();
    if (!perm.granted) {
      setError('Permita o microfone nas configurações.');
      return;
    }
    mod.start({ lang: accent, interimResults: true, continuous: false });
  }, [accent]);

  const stop = useCallback(() => {
    speechRecognition?.ExpoSpeechRecognitionModule.stop();
  }, []);

  return { supported: recognitionSupported, listening, error, start, stop };
}
