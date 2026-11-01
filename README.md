# Teleatendimento

Plataforma de teleatendimento em saúde. Esta é a **Fase 0**: sala de videoconferência (LiveKit) usada primeiro no kickoff da equipe.

## Como funciona

- `/` — escolhe o nome da sala.
- `/sala/<nome>` — pede nome e senha, depois entra na videochamada (câmera, microfone, tela compartilhada, chat).
- `/api/token` — valida a senha no servidor e emite um token LiveKit de 2h. A chave secreta nunca vai ao navegador.
- Proteções: senha compartilhada comparada em tempo constante, limite de 10 tentativas por IP a cada 10 min, nome de sala validado, gravação não habilitada.

> **Sem dados de pacientes nesta fase.** Para consultas reais será escolhido o ambiente de vídeo definitivo (Fase 3), com contrato de tratamento de dados e hospedagem adequada.

## Configuração

1. Crie um projeto em <https://cloud.livekit.io> e copie URL, API Key e API Secret (Settings → Keys).
2. `cp .env.example .env.local` e preencha os 4 valores (`ROOM_PASSWORD` é a senha que a equipe vai usar).
3. `npm install && npm run dev` → <http://localhost:3000>

## Publicação (Vercel)

1. Importe o repositório em <https://vercel.com/new>.
2. Em *Settings → Environment Variables*, cadastre `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET` e `ROOM_PASSWORD`.
3. Faça o deploy. O HTTPS é automático (obrigatório para câmera e microfone).

## Roteiro de testes antes do kickoff

- [ ] 3 ou mais pessoas na mesma sala
- [ ] Celular Android e iPhone (Safari)
- [ ] Compartilhar tela no desktop
- [ ] Rede ruim (4G)
- [ ] Senha errada é recusada
