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

## Como funciona

- **Curso:** 90 lições (~1 por dia = meta de 3 meses). A 1ª tem 5 palavras (I, you, is, to, the); as seguintes, de 3 a 5 novas. Conteúdo em `src/data/course/` (formato compacto, validado por testes).
- **Exercício:** reconhecer (significado), usar em frase curta e mini conversa com o coach. Correção pela IA (ver abaixo).
- **Desbloqueio:** a lição só conta se você não desistir (pular) de mais de 20% dos passos; a próxima só libera depois da anterior.
- **Revisão espaçada:** caixas de Leitner com intervalos 0/1/3/7/14/30/60 dias. Acerto sobe uma caixa; erro desce duas e a palavra volta em 10 minutos. Perguntas: completar a frase (digitando ou falando) e traduzir (montando a frase com palavras).
- **Progresso:** trilha das 90 fases (concluída / atual / bloqueada), palavras aprendidas e barra até a meta de 3 meses (dia X de 90).
- **Praticar (aba extra):** três treinos de inglês para o trabalho, em pacotes que liberam conforme o curso avança (`src/data/practice/`):
  - *Vocabulário de trabalho:* 4 pacotes de 6 palavras (significado e completar a frase).
  - *Entendendo a conversa:* 3 pacotes de falas de reunião; o aluno ouve (normal ou devagar) e escolhe o significado.
  - *Falando nas reuniões:* 4 cenários; o Gemini faz as perguntas (tema enviado ao `/coach`) e corrige as respostas, com perguntas de reserva se a IA falhar.
  - Um pacote conclui com 60% de acertos. Os testes garantem que as palavras de cada cenário já foram ensinadas na lição que o libera.
- **Dados:** tudo salvo localmente (AsyncStorage), sem login. Ajustes: sotaque, velocidade, lembrete diário 19h, apagar progresso.

## Testes e builds

```bash
npm test            # domínio: curso, revisão espaçada, desbloqueio (node:test)
npm run typecheck
npx eas build --profile development --platform android   # development build
npx eas build --profile production --platform all        # lojas
```

Contas e credenciais (EAS, Apple, Google Play) são suas; nada disso está configurado no repositório.

## Proxy de IA (Fase 3)

O app nunca vê a chave do Gemini: ela fica no Worker em `worker/`.

```bash
cd worker && npm install
npx wrangler secret put GEMINI_API_KEY
npx wrangler secret put APP_TOKEN      # opcional
npm test && npm run deploy
```

Depois copie `.env.example` para `.env` e preencha `EXPO_PUBLIC_AI_PROXY_URL` (e `EXPO_PUBLIC_APP_TOKEN`).
Sem a URL, o app usa o corretor local de teste. O modelo é configurável em `worker/wrangler.toml` (`GEMINI_MODEL`).

Endpoints:

- `POST /check` (`mode`: `sentence` ou `conversation`) devolve `{ correct, corrected, explanationPt, reply? }`; em caso de acerto na conversa, `reply` é a reação do coach.
- `POST /coach` recebe `{ words, history, accent, topic? }` e devolve a próxima pergunta da mini conversa: `{ coach, coachPt, suggestion }`. O Worker só aceita a pergunta se a resposta-modelo usar uma palavra da lição e se ela não repetir o histórico.

Na mini conversa o app pré-carrega a pergunta enquanto o aluno termina a parte 2 e já pede a próxima ao acertar. Se a IA falhar ou demorar mais de 8 s, usa as perguntas fixas de `src/data/course/`.
