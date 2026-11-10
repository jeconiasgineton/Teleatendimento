import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import { setAuth } from '../src/services/auth.ts';
import { createRemoteClient } from '../src/services/ai/remoteClient.ts';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const req = { words: ['go'], history: [{ coach: 'Hi?', student: 'I go.' }], accent: 'en-US' as const };

test('nextCoachTurn envia o histórico e devolve só os campos esperados', async () => {
  let seen: { url: string; headers: Record<string, string>; body: unknown } | null = null;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) };
    return new Response(JSON.stringify({ coach: 'Where do you go?', coachPt: 'Aonde você vai?', suggestion: 'I go home.', extra: 1 }));
  }) as typeof fetch;

  const turn = await createRemoteClient('https://x.dev/').nextCoachTurn!(req);
  assert.deepEqual(turn, { coach: 'Where do you go?', coachPt: 'Aonde você vai?', suggestion: 'I go home.' });
  assert.equal(seen!.url, 'https://x.dev/coach');
  assert.equal(seen!.headers['content-type'], 'application/json');
  assert.deepEqual(seen!.body, req);
});

test('nextCoachTurn rejeita resposta inválida e erro HTTP', async () => {
  const client = createRemoteClient('https://x.dev');
  globalThis.fetch = (async () => new Response(JSON.stringify({ coach: 'x', coachPt: '', suggestion: 'y' }))) as typeof fetch;
  await assert.rejects(client.nextCoachTurn!(req));
  globalThis.fetch = (async () => new Response('no', { status: 502 })) as typeof fetch;
  await assert.rejects(client.nextCoachTurn!(req));
});

test('checkSentence continua funcionando', async () => {
  globalThis.fetch = (async () => new Response(JSON.stringify({ correct: true, corrected: 'I go.', explanationPt: '' }))) as typeof fetch;
  const r = await createRemoteClient('https://x.dev').checkSentence({
    mode: 'sentence', accent: 'en-US', sentence: 'I go', targetWords: ['go'], reference: 'I go.', tip: '',
  });
  assert.equal(r.correct, true);
});

test('chat envia o pedido e valida a resposta', async () => {
  const sent: unknown[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    sent.push({ url, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify({ segments: [{ lang: 'en', text: 'Hi!' }, { lang: 'pt', text: 'Oi!' }], nextListen: 'pt', end: false }));
  }) as typeof fetch;
  const client = createRemoteClient('https://x.dev');
  const r = await client.chat!({ history: [], words: ['go'], accent: 'en-US' });
  assert.equal(r.nextListen, 'pt');
  assert.equal(r.segments.length, 2);
  assert.equal((sent[0] as { url: string }).url, 'https://x.dev/chat');
});

test('chat rejeita resposta fora do formato', async () => {
  const client = createRemoteClient('https://x.dev');
  const bad = [
    { segments: [], nextListen: 'en', end: false },
    { segments: [{ lang: 'fr', text: 'Salut' }], nextListen: 'en', end: false },
    { segments: [{ lang: 'en', text: 'Hi' }], nextListen: 'es', end: false },
    { segments: [{ lang: 'en', text: 'Hi' }], nextListen: 'en' },
  ];
  for (const body of bad) {
    globalThis.fetch = (async () => new Response(JSON.stringify(body))) as typeof fetch;
    await assert.rejects(client.chat!({ history: [], words: [], accent: 'en-US' }));
  }
});

test('envia o id do aparelho e o token do plano, e lê erros do servidor', async () => {
  setAuth({ deviceId: 'device-1234567890abcd', token: 'tok-123' });
  let headers: Record<string, string> = {};
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    headers = init.headers as Record<string, string>;
    return new Response(JSON.stringify({ error: 'daily_limit', limit: 30, resetsAt: 123 }), { status: 429 });
  }) as typeof fetch;
  const client = createRemoteClient('https://x.dev');
  const err = await client.checkSentence({ mode: 'sentence', accent: 'en-US', sentence: 'I go', targetWords: ['go'], reference: 'I go.', tip: '' }).catch((e) => e);
  assert.equal(headers['x-device-id'], 'device-1234567890abcd');
  assert.equal(headers.authorization, 'Bearer tok-123');
  assert.equal(err.name, 'ApiError');
  assert.equal(err.status, 429);
  assert.equal(err.code, 'daily_limit');
  assert.equal(err.limit, 30);
  assert.equal(err.resetsAt, 123);
  setAuth({ token: null });
});

test('manda o nível e entrega a análise completa e o uso do dia', async () => {
  let sent: { level?: string } = {};
  globalThis.fetch = (async (_u: string, init: RequestInit) => {
    sent = JSON.parse(String(init.body));
    return new Response(
      JSON.stringify({
        correct: false,
        corrected: 'I took a photo.',
        explanationPt: 'Use take.',
        issues: [{ type: 'word-choice', original: 'make a photo', fix: 'take a photo', explanationPt: 'Combinação correta.' }],
        natural: 'I took a picture.',
        usage: { used: 3, limit: 30 },
      }),
    );
  }) as typeof fetch;
  const r = await createRemoteClient('https://x.dev').checkSentence({
    mode: 'sentence', level: 'A2', accent: 'en-US', sentence: 'I make a photo', targetWords: ['photo'], reference: 'I took a photo.', tip: '',
  });
  assert.equal(sent.level, 'A2');
  assert.equal(r.issues?.[0].type, 'word-choice');
  assert.equal(r.natural, 'I took a picture.');
  assert.deepEqual(r.usage, { used: 3, limit: 30 });
});
