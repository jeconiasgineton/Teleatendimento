import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COURSE } from '../src/data/course/index.ts';
import { applyLessonResult, applyReviewResult, courseStats, currentLessonId, initialProgress, lessonPassed, lessonStatus } from '../src/domain/progress.ts';
import { DAY_MS } from '../src/domain/srs.ts';

const NOW = 1_000_000_000_000;
const ok = (n: number) => ({ totalSteps: n, skipped: 0, missedWordIds: [] as string[] });

test('só a lição 1 está liberada no começo', () => {
  const s = initialProgress(NOW);
  assert.equal(currentLessonId(s, COURSE), 1);
  assert.equal(lessonStatus(s, 1, COURSE), 'current');
  assert.equal(lessonStatus(s, 2, COURSE), 'locked');
});

test('passar libera a próxima e registra palavras e revisões', () => {
  const s = applyLessonResult(initialProgress(NOW), COURSE[0], ok(12), NOW);
  assert.equal(currentLessonId(s, COURSE), 2);
  assert.equal(lessonStatus(s, 1, COURSE), 'completed');
  assert.deepEqual(s.learned, ['i', 'you', 'is', 'to', 'the']);
  assert.equal(s.reviews['i'].due, NOW + DAY_MS);
});

test('desistir demais não passa nem muda nada', () => {
  const s0 = initialProgress(NOW);
  const r = { totalSteps: 10, skipped: 3, missedWordIds: [] };
  assert.equal(lessonPassed(r), false);
  assert.equal(applyLessonResult(s0, COURSE[0], r, NOW), s0);
});

test('não dá para pular fases', () => {
  const s0 = initialProgress(NOW);
  assert.equal(applyLessonResult(s0, COURSE[2], ok(12), NOW), s0);
});

test('palavra errada na lição entra na revisão para já', () => {
  const s = applyLessonResult(initialProgress(NOW), COURSE[0], { ...ok(12), missedWordIds: ['you'] }, NOW);
  assert.equal(s.reviews['you'].due, NOW);
  assert.equal(s.reviews['you'].box, 0);
});

test('refazer lição não duplica palavras nem reinicia revisões', () => {
  const s1 = applyLessonResult(initialProgress(NOW), COURSE[0], ok(12), NOW);
  const s2 = applyLessonResult(s1, COURSE[0], ok(12), NOW + 5);
  assert.equal(s2.learned.length, 5);
  assert.equal(s2.reviews['i'], s1.reviews['i']);
});

test('applyReviewResult e courseStats', () => {
  let s = applyLessonResult(initialProgress(NOW), COURSE[0], ok(12), NOW);
  s = applyReviewResult(s, 'i', true, NOW);
  assert.equal(s.reviews['i'].box, 2);
  const st = courseStats(s, COURSE, NOW + 4 * DAY_MS);
  assert.equal(st.wordsLearned, 5);
  assert.equal(st.day, 5);
  assert.equal(st.lessonsDone, 1);
  assert.ok(st.totalWords > 300);
  assert.ok(st.percent >= 1);
});
