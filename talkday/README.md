# TalkDay

App React Native (Expo + TypeScript) para aprender inglês do dia a dia em 3 meses:
vocabulário de alta frequência, frases curtas com correção imediata e revisão espaçada.

## Rodar

Reconhecimento de voz é nativo, então **não funciona no Expo Go**. Use um development build:

```bash
npm install
npx expo run:android   # ou: npx expo run:ios (macOS)
npm run typecheck
```

## Estrutura

```
src/
  app/          rotas (Expo Router): index (exercício), review, progress, settings
  components/   UI (ExerciseScreen, WordHero, PhraseInput, FeedbackBanner, ...)
  context/      configurações (sotaque, velocidade)
  data/         lições e mensagens de feedback
  domain/       tipos e montagem dos passos do exercício
  hooks/        useExercise (máquina de estados), useSpeechInput
  services/     speech (TTS), speechRecognition (STT), ai (cliente de correção)
```

## Status das fases

1. Estrutura do projeto: feita
2. Tela de exercício: feita (correção local provisória em `services/ai/mockClient.ts`)
3. Proxy Cloudflare Workers + Gemini: pendente
4. Conteúdo completo, desbloqueio de fases e persistência (SQLite): pendente
5. Revisão espaçada: pendente
6. Tela de progresso: pendente
7. Acabamento e builds EAS: pendente
