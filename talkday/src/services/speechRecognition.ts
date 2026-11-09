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
