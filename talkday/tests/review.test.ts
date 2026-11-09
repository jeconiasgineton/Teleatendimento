import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkComplete, checkTranslate, makeBlank, pickKind, sentenceTokens } from '../src/domain/review.ts';

test('makeBlank troca só a palavra inteira', () => {
  assert.equal(makeBlank('I am happy.', 'am'), 'I _____ happy.');
  assert.equal(makeBlank('I am happy.', 'I'), '_____ am happy.');
  assert.equal(makeBlank('The book is here.', 'the'), '_____ book is here.');
  assert.equal(makeBlank('Say it again, please.', 'it'), 'Say _____ again, please.');
});

test('checkComplete aceita variações de caixa e frase falada', () => {
  assert.ok(checkComplete(' AM ', 'am'));
  assert.ok(checkComplete('I am happy', 'am'));
  assert.ok(!checkComplete('amazing', 'am'));
  assert.ok(!checkComplete('', 'am'));
  assert.ok(checkComplete("don't", "don't"));
});

test('checkTranslate ignora pontuação e caixa', () => {
  assert.ok(checkTranslate(['i', 'am', 'happy'], 'I am happy.'));
  assert.ok(!checkTranslate(['am', 'I', 'happy'], 'I am happy.'));
  assert.deepEqual(sentenceTokens('She  is my sister.'), ['She', 'is', 'my', 'sister.']);
});

test('pickKind alterna', () => {
  assert.equal(pickKind(1, 0), 'translate');
  assert.equal(pickKind(2, 0), 'complete');
});
