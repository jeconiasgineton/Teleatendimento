import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
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

  const turn = await createRemoteClient('https://x.dev/', 'tok').nextCoachTurn!(req);
  assert.deepEqual(turn, { coach: 'Where do you go?', coachPt: 'Aonde você vai?', suggestion: 'I go home.' });
  assert.equal(seen!.url, 'https://x.dev/coach');
  assert.equal(seen!.headers['x-app-token'], 'tok');
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
