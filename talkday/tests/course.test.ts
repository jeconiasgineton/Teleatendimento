import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COURSE } from '../src/data/course/index.ts';

const tokens = (s: string): string[] => s.toLowerCase().match(/[a-z']+/g) ?? [];

test('90 lições em sequência', () => {
  assert.equal(COURSE.length, 90);
  COURSE.forEach((l, i) => assert.equal(l.id, i + 1));
});

test('lição 1 tem as 5 palavras básicas', () => {
  assert.deepEqual(COURSE[0].words.map((w) => w.text), ['I', 'you', 'is', 'to', 'the']);
});

test('lições seguintes têm de 3 a 5 palavras novas', () => {
  for (const l of COURSE.slice(1)) assert.ok(l.words.length >= 3 && l.words.length <= 5, `lição ${l.id}: ${l.words.length}`);
});

test('palavras são únicas', () => {
  const seen = new Set<string>();
  for (const l of COURSE) for (const w of l.words) {
    assert.ok(!seen.has(w.id), `duplicada: ${w.id} (lição ${l.id})`);
    seen.add(w.id);
  }
});

test('exemplos usam a palavra', () => {
  for (const l of COURSE) for (const w of l.words) {
    assert.ok(tokens(w.example).includes(w.text.toLowerCase()), `lição ${l.id}: "${w.text}" fora de "${w.example}"`);
  }
});

test('respostas sugeridas usam palavras da lição e há ao menos 2 turnos', () => {
  for (const l of COURSE) {
    assert.ok(l.conversation.length >= 2, `lição ${l.id}`);
    const targets = l.words.map((w) => w.text.toLowerCase());
    for (const t of l.conversation) {
      assert.ok(tokens(t.suggestion).some((x) => targets.includes(x)), `lição ${l.id}: "${t.suggestion}"`);
    }
  }
});
