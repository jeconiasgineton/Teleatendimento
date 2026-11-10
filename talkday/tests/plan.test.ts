import assert from 'node:assert/strict';
import { test } from 'node:test';
import { levelForLesson, levelFromProgress } from '../src/domain/level.ts';
import { FREE_DAILY_LIMIT, RENEW_BEFORE_MS, can, limitMessage, shouldRenew } from '../src/domain/plan.ts';

test('free não acessa nenhuma conversa nem correção ilimitada', () => {
  for (const f of ['free-talk', 'meeting', 'ai-coach', 'unlimited-correction', 'unlock-all'] as const) assert.equal(can('free', f), false, f);
});

test('premium acessa todas as conversas, mas não libera lições', () => {
  for (const f of ['free-talk', 'meeting', 'ai-coach', 'unlimited-correction'] as const) assert.equal(can('premium', f), true, f);
  assert.equal(can('premium', 'unlock-all'), false);
});

test('master acessa tudo, inclusive liberar lições e pacotes', () => {
  for (const f of ['free-talk', 'meeting', 'ai-coach', 'unlimited-correction', 'unlock-all'] as const) assert.equal(can('master', f), true, f);
});

test('renovação do token quando falta pouco', () => {
  const now = 1_000_000_000_000;
  assert.equal(shouldRenew(null, now), false);
  assert.equal(shouldRenew(now + RENEW_BEFORE_MS + 1000, now), false);
  assert.equal(shouldRenew(now + RENEW_BEFORE_MS - 1000, now), true);
  assert.equal(shouldRenew(now - 5, now), true);
});

test('mensagem do limite cita a quantidade', () => {
  assert.match(limitMessage(FREE_DAILY_LIMIT), /30 correções/);
  assert.match(limitMessage(30, Date.now() + 3600_000), /Volta amanhã às/);
});

test('nível pelo ponto do curso', () => {
  assert.deepEqual([1, 40, 41, 70, 71, 90].map(levelForLesson), ['A1', 'A1', 'A2', 'A2', 'B1', 'B1']);
  assert.equal(levelFromProgress({}), 'A1');
  assert.equal(levelFromProgress({ 1: {}, 45: {}, 3: {} }), 'A2');
});
