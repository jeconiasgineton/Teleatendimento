import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAY_MS, INTERVAL_DAYS, MAX_BOX, WRONG_DELAY_MS, dueItems, formatWait, gradeReview, newItem, nextDue } from '../src/domain/srs.ts';

const NOW = 1_000_000_000_000;

test('palavra nova sem erro volta amanhã; com erro volta já', () => {
  assert.equal(newItem('a', NOW, false).due, NOW + DAY_MS);
  assert.equal(newItem('a', NOW, true).due, NOW);
});

test('acertos aumentam o intervalo até o máximo', () => {
  let item = newItem('a', NOW, false);
  let last = item.due - NOW;
  for (let i = 0; i < 10; i++) {
    item = gradeReview(item, true, NOW);
    const interval = item.due - NOW;
    assert.ok(interval >= last);
    last = interval;
  }
  assert.equal(item.box, MAX_BOX);
  assert.equal(last, INTERVAL_DAYS[MAX_BOX] * DAY_MS);
});

test('erro desce caixas e volta em minutos', () => {
  const item = { ...newItem('a', NOW, false), box: 4 };
  const wrong = gradeReview(item, false, NOW);
  assert.equal(wrong.box, 2);
  assert.equal(wrong.due, NOW + WRONG_DELAY_MS);
  assert.equal(wrong.lapses, 1);
  assert.equal(gradeReview(newItem('b', NOW, true), false, NOW).box, 0);
});

test('dueItems ordena por vencimento; nextDue acha o mais próximo', () => {
  const items = [
    { ...newItem('a', NOW, false), due: NOW - 5 },
    { ...newItem('b', NOW, false), due: NOW - 10 },
    { ...newItem('c', NOW, false), due: NOW + 3000 },
    { ...newItem('d', NOW, false), due: NOW + 1000 },
  ];
  assert.deepEqual(dueItems(items, NOW).map((i) => i.wordId), ['b', 'a']);
  assert.equal(nextDue(items, NOW), NOW + 1000);
  assert.equal(nextDue([], NOW), null);
});

test('formatWait', () => {
  assert.equal(formatWait(10 * 60000), '10 min');
  assert.equal(formatWait(3 * 3600000), '3 h');
  assert.equal(formatWait(DAY_MS), '1 dia');
  assert.equal(formatWait(3 * DAY_MS), '3 dias');
});
