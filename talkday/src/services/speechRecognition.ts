/**
 * Acesso seguro ao reconhecimento de voz. O módulo é nativo: não existe no
 * Expo Go nem na web, então carregamos com try/catch e o app cai para digitação.
 */
type Mod = typeof import('expo-speech-recognition');

let mod: Mod | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  mod = require('expo-speech-recognition') as Mod;
} catch {
  mod = null;
}

export const speechRecognition = mod;
export const recognitionSupported = mod !== null;

export type ListenOutcome =
  | { status: 'ok'; text: string; confidence?: number }
  | { status: 'silence' }
  | { status: 'denied' }
  | { status: 'error'; error: string }
  | { status: 'cancelled' };

export interface ListenOptions {
  /** Idioma do reconhecedor, ex.: "en-US" ou "pt-BR". */
  lang: string;
  /** Tempo máximo de uma escuta. */
  maxMs?: number;
  /** Texto parcial enquanto o aluno fala. */
  onInterim?: (text: string) => void;
}

/**
 * Escuta UMA fala, sem botão: termina sozinha quando o aluno para de falar.
 * No Android usa o modo contínuo (evita o "bip" a cada escuta) e aborta ao
 * receber o resultado final.
 */
export function listenOnce(opts: ListenOptions): { promise: Promise<ListenOutcome>; cancel: () => void } {
  const mod = speechRecognition?.ExpoSpeechRecognitionModule;
  let settled = false;
  let last = '';
  let confidence: number | undefined;
  let resolveFn: (o: ListenOutcome) => void = () => {};
  const promise = new Promise<ListenOutcome>((res) => {
    resolveFn = res;
  });
  const subs: { remove: () => void }[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;

  const finish = (o: ListenOutcome) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    subs.forEach((s) => s.remove());
    resolveFn(o);
  };
  const heard = (): ListenOutcome => (last.trim() ? { status: 'ok', text: last.trim(), confidence } : { status: 'silence' });

  if (!mod) {
    finish({ status: 'error', error: 'unsupported' });
    return { promise, cancel: () => {} };
  }

  subs.push(
    mod.addListener('result', (e) => {
      const r = e.results?.[0];
      if (!r) return;
      last = r.transcript;
      confidence = r.confidence > 0 ? r.confidence : undefined;
      opts.onInterim?.(last);
      if (e.isFinal) {
        try {
          mod.abort();
        } catch {
          // já parou
        }
        finish(heard());
      }
    }),
    mod.addListener('error', (e) => {
      if (e.error === 'aborted') return;
      if (e.error === 'no-speech' || e.error === 'speech-timeout') finish(heard());
      else if (e.error === 'not-allowed' || e.error === 'service-not-allowed') finish({ status: 'denied' });
      else finish({ status: 'error', error: e.error });
    }),
    mod.addListener('end', () => finish(heard())),
  );

  // Rede de segurança: se o reconhecedor travar, encerra a escuta.
  timer = setTimeout(() => {
    try {
      mod.stop();
    } catch {
      // ignora
    }
    setTimeout(() => finish(heard()), 1500);
  }, opts.maxMs ?? 20000);

  try {
    mod.start({
      lang: opts.lang,
      interimResults: true,
      continuous: true,
      androidIntentOptions: {
        EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
        EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 2000,
      },
      iosCategory: { category: 'playAndRecord', categoryOptions: ['defaultToSpeaker', 'allowBluetooth'], mode: 'default' },
    });
  } catch {
    finish({ status: 'error', error: 'start-failed' });
  }

  return {
    promise,
    cancel: () => {
      try {
        mod.abort();
      } catch {
        // ignora
      }
      finish({ status: 'cancelled' });
    },
  };
}

export async function requestMicPermission(): Promise<boolean> {
  if (!speechRecognition) return false;
  try {
    const r = await speechRecognition.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return r.granted;
  } catch {
    return false;
  }
}
