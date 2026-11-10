import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COURSE } from '../src/data/course/index.ts';
import { LISTEN_PACKS, MEETING_PACKS, VOCAB_PACKS } from '../src/data/practice/index.ts';
import { applyLessonResult, initialProgress } from '../src/domain/progress.ts';
import {
  PASS_PERCENT, applyPracticeResult, buildListenQuestions, buildVocabQuestions, packDone, packStatus, packUnlocked,
} from '../src/domain/practice.ts';

const NOW = 1_000_000_000_000;
const tokens = (s: string): string[] => s.toLowerCase().match(/[a-z']+/g) ?? [];
const ALL_PACKS = [...VOCAB_PACKS, ...LISTEN_PACKS, ...MEETING_PACKS];

function completeUpTo(n: number) {
  let s = initialProgress(NOW);
  for (const l of COURSE.slice(0, n)) s = applyLessonResult(s, l, { totalSteps: 10, skipped: 0, missedWordIds: [] }, NOW);
  return s;
}

test('ids de pacotes são únicos e as lições de liberação existem', () => {
  const ids = ALL_PACKS.map((p) => p.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const p of ALL_PACKS) assert.ok(COURSE.some((l) => l.id === p.unlockAfter), p.id);
});

test('vocabulário: exemplos usam a palavra e cada pacote tem 6 palavras', () => {
  for (const p of VOCAB_PACKS) {
    assert.equal(p.words.length, 6);
    for (const w of p.words) assert.ok(tokens(w.example).includes(w.text.toLowerCase()), `${p.id}: ${w.text}`);
  }
});

test('reuniões: palavras já aprendidas na lição que libera o pacote', () => {
  const learnedBy = (lessonId: number) =>
    new Set(COURSE.filter((l) => l.id <= lessonId).flatMap((l) => l.words.map((w) => w.text.toLowerCase())));
  for (const p of MEETING_PACKS) {
    const known = learnedBy(p.unlockAfter);
    assert.ok(p.words.length <= 10, p.id);
    for (const w of p.words) assert.ok(known.has(w.toLowerCase()), `${p.id}: "${w}" ainda não foi ensinada`);
    assert.equal(p.turns.length, 3);
    for (const t of p.turns) {
      assert.ok(tokens(t.suggestion).some((x) => known.has(x) && p.words.map((w: string) => w.toLowerCase()).includes(x)), `${p.id}: ${t.suggestion}`);
    }
  }
});

test('perguntas de múltipla escolha: resposta entre as opções, sem repetição', () => {
  const qs = [...VOCAB_PACKS.flatMap(buildVocabQuestions), ...LISTEN_PACKS.flatMap(buildListenQuestions)];
  assert.ok(qs.length > 0);
  for (const q of qs) {
    assert.equal(q.options.length, 3, q.id);
    assert.equal(new Set(q.options).size, 3, q.id);
    assert.ok(q.options.includes(q.answer), q.id);
  }
  assert.equal(buildVocabQuestions(VOCAB_PACKS[0]).length, 12);
  assert.equal(buildListenQuestions(LISTEN_PACKS[0]).length, 6);
});

test('lacuna esconde a palavra', () => {
  for (const q of buildVocabQuestions(VOCAB_PACKS[0]).filter((x) => x.id.includes(':b:'))) {
    assert.ok(q.big!.includes('_____'), q.id);
    assert.ok(!tokens(q.big!).includes(q.answer.toLowerCase()), q.id);
  }
});

test('liberação conforme o curso avança', () => {
  const s0 = initialProgress(NOW);
  assert.equal(packUnlocked(s0, VOCAB_PACKS[0]), false);
  assert.equal(packStatus(s0, MEETING_PACKS[0]), 'locked');
  const s12 = completeUpTo(12);
  assert.equal(packStatus(s12, MEETING_PACKS[0]), 'available');
  assert.equal(packStatus(s12, VOCAB_PACKS[0]), 'available');
  assert.equal(packStatus(s12, LISTEN_PACKS[0]), 'locked');
  assert.equal(packStatus(s12, MEETING_PACKS[1]), 'locked');
});

test('resultado guarda o melhor e conclui a partir do mínimo', () => {
  let s = completeUpTo(12);
  s = applyPracticeResult(s, 'meeting-1', PASS_PERCENT - 1, NOW);
  assert.equal(packDone(s, MEETING_PACKS[0]), false);
  s = applyPracticeResult(s, 'meeting-1', PASS_PERCENT, NOW);
  assert.equal(packStatus(s, MEETING_PACKS[0]), 'done');
  s = applyPracticeResult(s, 'meeting-1', 10, NOW);
  assert.equal(s.practice['meeting-1'].best, PASS_PERCENT);
  assert.equal(applyPracticeResult(s, 'x', 250, NOW).practice['x'].best, 100);
});
