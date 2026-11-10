import assert from 'node:assert/strict';
import { test } from 'node:test';
import { handle } from '../src/index.ts';
import { normalizeResult, parseCheckRequest } from '../src/validate.ts';
import type { Env } from '../src/types.ts';

const env: Env = { GEMINI_API_KEY: 'k', APP_TOKEN: 'secret' };

const post = (body: unknown, headers: Record<string, string> = { 'x-app-token': 'secret' }) =>
  new Request('https://x/check', { method: 'POST', body: JSON.stringify(body), headers });

const geminiReturns = (obj: unknown): typeof fetch =>
  (async () =>
    new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }))) as typeof fetch;

const base = { mode: 'sentence', sentence: 'I am happy', targetWords: ['I'], accent: 'en-US' };

test('rejeita sem token', async () => {
  assert.equal((await handle(post(base, {}), env, geminiReturns({}))).status, 401);
});

test('rejeita entradas inválidas', () => {
  assert.equal(parseCheckRequest({ ...base, sentence: 'x'.repeat(201) }).ok, false);
  assert.equal(parseCheckRequest({ ...base, targetWords: [] }).ok, false);
  assert.equal(parseCheckRequest({ ...base, mode: 'conversation' }).ok, false);
  assert.equal(parseCheckRequest({ ...base, sentence: '   ' }).ok, false);
});

test('acerto devolve resultado limpo', async () => {
  const res = await handle(
    post(base),
    env,
    geminiReturns({ correct: true, corrected: 'I am happy.', explanationPt: 'ignorada', replyEn: '', replyPt: '' }),
  );
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { correct: true, corrected: 'I am happy.', explanationPt: '' });
});

test('erro exige explicação', () => {
  const req = parseCheckRequest(base);
  assert.ok(req.ok);
  assert.equal(normalizeResult({ correct: false, corrected: 'I am happy.', explanationPt: '' }, req.value), null);
});

test('conversa acertada inclui reply', () => {
  const req = parseCheckRequest({ ...base, mode: 'conversation', context: 'How are you?' });
  assert.ok(req.ok);
  const r = normalizeResult({ correct: true, corrected: 'I am fine.', explanationPt: '', replyEn: 'Great!', replyPt: 'Ótimo!' }, req.value);
  assert.deepEqual(r?.reply, { en: 'Great!', pt: 'Ótimo!' });
});

test('falha do Gemini vira 502 sem vazar detalhes', async () => {
  const failing = (async () => new Response('boom', { status: 500 })) as typeof fetch;
  const res = await handle(post(base), env, failing);
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), { error: 'falha na IA' });
});

// ---- /coach ----

import { normalizeCoach, parseCoachRequest } from '../src/validate.ts';

const coachBody = { words: ['go', 'park'], history: [], accent: 'en-US' };
const postCoach = (body: unknown) =>
  new Request('https://x/coach', { method: 'POST', body: JSON.stringify(body), headers: { 'x-app-token': 'secret' } });

test('coach: devolve pergunta válida', async () => {
  const ok = { coach: 'Where do you go today?', coachPt: 'Aonde você vai hoje?', suggestion: 'I go to the park.' };
  const res = await handle(postCoach(coachBody), env, geminiReturns(ok));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), ok);
});

test('coach: rejeita entradas inválidas', () => {
  assert.equal(parseCoachRequest({ ...coachBody, words: [] }).ok, false);
  assert.equal(parseCoachRequest({ ...coachBody, history: [1, 2, 3, 4] }).ok, false);
  assert.equal(parseCoachRequest({ ...coachBody, history: [{ coach: 'a' }] }).ok, false);
  assert.equal(parseCoachRequest({ ...coachBody, history: [{ coach: 'a', student: 'b' }] }).ok, true);
});

test('coach: resposta-modelo sem palavra da lição é rejeitada', () => {
  const req = parseCoachRequest(coachBody);
  assert.ok(req.ok);
  assert.equal(normalizeCoach({ coach: 'How are you?', coachPt: 'Como vai?', suggestion: 'I am fine.' }, req.value), null);
});

test('coach: não repete pergunta do histórico', () => {
  const req = parseCoachRequest({ ...coachBody, history: [{ coach: 'Where do you go?', student: 'I go home.' }] });
  assert.ok(req.ok);
  const dup = { coach: 'where do you go?', coachPt: 'Aonde você vai?', suggestion: 'I go to the park.' };
  assert.equal(normalizeCoach(dup, req.value), null);
});

test('coach: exige token e devolve 502 se a IA falhar', async () => {
  assert.equal((await handle(new Request('https://x/coach', { method: 'POST', body: '{}' }), env, geminiReturns({}))).status, 401);
  const failing = (async () => new Response('boom', { status: 500 })) as typeof fetch;
  assert.equal((await handle(postCoach(coachBody), env, failing)).status, 502);
});
