import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COURSE } from '../src/data/course/index.ts';
import { normalizeEmail, normalizePhone, passwordProblem } from '../src/domain/contact.ts';
import { applyPracticeResult } from '../src/domain/practice.ts';
import { applyLessonResult, applyReviewResult, initialProgress, resetProgress, type ProgressState } from '../src/domain/progress.ts';
import { fingerprint, isEmptyProgress, mergeProgress, normalizeProgress } from '../src/domain/sync.ts';

const T0 = 1_000_000_000_000;
const ok = { totalSteps: 12, skipped: 0, missedWordIds: [] as string[] };

function upTo(n: number, now = T0): ProgressState {
  let s = initialProgress(T0);
  for (const l of COURSE.slice(0, n)) s = applyLessonResult(s, l, ok, now);
  return s;
}

test('contato: mesmas regras do servidor', () => {
  assert.equal(normalizeEmail(' Ana@Example.COM '), 'ana@example.com');
  assert.equal(normalizeEmail('ana@'), null);
  assert.equal(normalizePhone('(11) 98888-7777'), '5511988887777');
  assert.equal(normalizePhone('+1 (555) 123-4567'), '15551234567');
  assert.equal(normalizePhone('123'), null);
  assert.equal(passwordProblem('senha-forte-1', 'a@b.com'), null);
  assert.ok(passwordProblem('curta', 'a@b.com'));
  assert.ok(passwordProblem('aaaaaaaaaa', 'a@b.com'));
  assert.ok(passwordProblem('A@B.com', 'a@b.com'));
});

test('juntar dois aparelhos soma lições e palavras sem perder nada', () => {
  const phone = upTo(2);
  const tablet = upTo(3);
  const m = mergeProgress(phone, tablet);
  assert.deepEqual(Object.keys(m.completed).map(Number).sort(), [1, 2, 3]);
  assert.equal(m.learned.length, phone.learned.length + COURSE[2].words.length);
  assert.equal(new Set(m.learned).size, m.learned.length);
  // simétrico no conteúdo
  assert.equal(fingerprint(mergeProgress(tablet, phone)).length > 0, true);
  assert.deepEqual(Object.keys(mergeProgress(tablet, phone).completed).sort(), Object.keys(m.completed).sort());
});

test('juntar: nota maior, melhor prática e revisão mais recente vencem', () => {
  let a = upTo(1);
  let b = upTo(1, T0 + 5000);
  b = { ...b, completed: { 1: { score: 100, at: T0 + 5000 } } };
  a = { ...a, completed: { 1: { score: 80, at: T0 } } };
  a = applyPracticeResult(a, 'vocab-1', 90, T0);
  b = applyPracticeResult(b, 'vocab-1', 70, T0 + 10);
  a = applyReviewResult(a, 'i', true, T0 + 100);
  b = applyReviewResult(b, 'i', false, T0 + 900); // mais recente
  const m = mergeProgress(a, b);
  assert.equal(m.completed[1].score, 100);
  assert.equal(m.completed[1].at, T0);
  assert.equal(m.practice['vocab-1'].best, 90);
  assert.equal(m.reviews['i'].lastReviewed, T0 + 900);
});

test('apagar progresso não é desfeito pelo outro aparelho (época maior vence)', () => {
  const old = upTo(5);
  const wiped = resetProgress(old, T0 + 10_000);
  assert.equal(wiped.epoch, 1);
  assert.equal(isEmptyProgress(wiped), true);
  assert.deepEqual(mergeProgress(old, wiped), wiped);
  assert.deepEqual(mergeProgress(wiped, old), wiped);
  // depois de recomeçar na nova época, junta normalmente
  const again = applyLessonResult(wiped, COURSE[0], ok, T0 + 20_000);
  assert.equal(mergeProgress(again, wiped).learned.length, COURSE[0].words.length);
});

test('juntar é idempotente e não altera os originais', () => {
  const s = upTo(3);
  const copy = JSON.stringify(s);
  const m = mergeProgress(s, s);
  assert.equal(fingerprint(m), fingerprint(s));
  assert.equal(JSON.stringify(s), copy);
});

test('fingerprint ignora a ordem das chaves e muda quando algo muda', () => {
  const a = upTo(2);
  const reordered: ProgressState = { ...a, completed: Object.fromEntries(Object.entries(a.completed).reverse()) as ProgressState['completed'] };
  assert.equal(fingerprint(a), fingerprint(reordered));
  assert.notEqual(fingerprint(a), fingerprint(upTo(3)));
});

test('estado salvo antes das contas ganha época e prática', () => {
  const legacy = { version: 1, startedAt: T0, completed: {}, learned: [], reviews: {} } as unknown as ProgressState;
  const n = normalizeProgress(legacy);
  assert.equal(n.epoch, 0);
  assert.deepEqual(n.practice, {});
  assert.equal(isEmptyProgress(n), true);
});
