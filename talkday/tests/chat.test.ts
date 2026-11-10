import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fallbackReply, goodbyeReply, isStopPhrase, joinSegments, recentWords, silenceAction, trimHistory } from '../src/domain/chat.ts';

test('silêncio: ouve, pergunta se está aí, ouve de novo e encerra', () => {
  assert.deepEqual([1, 2, 3, 4, 9].map(silenceAction), ['relisten', 'nudge', 'relisten', 'end', 'end']);
});

test('trimHistory mantém só os turnos mais recentes', () => {
  const h = Array.from({ length: 15 }, (_, i) => ({ role: (i % 2 ? 'user' : 'ai') as 'ai' | 'user', text: `t${i}` }));
  const t = trimHistory(h);
  assert.equal(t.length, 10);
  assert.equal(t[0].text, 't5');
  assert.equal(t.at(-1)!.text, 't14');
  assert.equal(trimHistory(h.slice(0, 3)).length, 3);
});

test('despedidas curtas são reconhecidas, frases normais não', () => {
  for (const s of ['tchau', 'Goodbye!', ' bye ', 'parar.', 'Encerrar', 'stop']) assert.ok(isStopPhrase(s), s);
  for (const s of ['I stop at the park', 'tchau amigo, vou dormir', 'goodbye my friend', '', 'bye bye']) assert.ok(!isStopPhrase(s), s);
});

test('recentWords usa as últimas e ignora ids desconhecidos', () => {
  const byId = { a: { text: 'A' }, b: { text: 'B' }, c: { text: 'C' } };
  assert.deepEqual(recentWords(['a', 'x', 'b', 'c'], byId, 2), ['B', 'C']);
  assert.deepEqual(recentWords(['x', 'y'], byId), []);
});

test('respostas de emergência são válidas e bilíngues', () => {
  const f = fallbackReply();
  assert.equal(f.end, false);
  assert.deepEqual(f.segments.map((s) => s.lang), ['en', 'pt']);
  assert.equal(goodbyeReply().end, true);
  assert.equal(joinSegments(f.segments), 'Sorry, I had a problem. Can you say that again? Desculpe, tive um problema. Pode repetir?');
});
