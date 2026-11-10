import assert from 'node:assert/strict';
import { test } from 'node:test';
import { generateCode, redeem, signToken, usageDay, verifyCode, verifyToken } from '../src/auth.ts';
import { handle } from '../src/index.ts';
import { buildChatPrompt, buildUserPrompt } from '../src/prompts.ts';
import { FREE_DAILY_LIMIT, type Env, type UsageNamespace } from '../src/types.ts';
import {
  normalizeChat, normalizeCoach, normalizeResult, parseChatRequest, parseCheckRequest, parseCoachRequest,
} from '../src/validate.ts';

const NOW = Date.UTC(2026, 10, 10, 15, 0, 0);
const DEVICE = 'device-1234567890abcd';

function memoryUsage(): UsageNamespace & { counts: Map<string, number> } {
  const counts = new Map<string, number>();
  return {
    counts,
    idFromName: (n: string) => n,
    get: (id: unknown) => ({
      fetch: async () => {
        const n = (counts.get(String(id)) ?? 0) + 1;
        counts.set(String(id), n);
        return new Response(String(n));
      },
    }),
  };
}

const baseEnv = (): Env => ({ GEMINI_API_KEY: 'k', AUTH_SECRET: 's'.repeat(40), MASTER_CODE: 'my-master-code-123' });

async function tokenFor(env: Env, plan: 'premium' | 'master'): Promise<string> {
  const code = plan === 'master' ? env.MASTER_CODE! : (await generateCode(env.AUTH_SECRET!, 30, NOW)).code;
  return (await redeem(env, code, NOW))!.token;
}

const req = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://x${path}`, { method: 'POST', body: JSON.stringify(body), headers });

const geminiReturns = (obj: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }))) as typeof fetch;
const failing = (async () => new Response('boom', { status: 500 })) as typeof fetch;

// ---------------- auth: tokens e códigos ----------------

test('token: assina, verifica e rejeita adulteração, segredo errado e vencimento', async () => {
  const p = { p: 'premium' as const, e: Math.floor(NOW / 1000) + 60, c: 'ABC123' };
  const t = await signToken('segredo', p);
  assert.deepEqual(await verifyToken('segredo', t, NOW), p);
  assert.equal(await verifyToken('outro', t, NOW), null);
  assert.equal(await verifyToken('segredo', t, NOW + 61_000), null);
  const [v, body, sig] = t.split('.');
  const forged = btoa(JSON.stringify({ ...p, p: 'master' })).replace(/=+$/, '');
  assert.equal(await verifyToken('segredo', `${v}.${forged}.${sig}`, NOW), null);
  assert.equal(await verifyToken('segredo', `${v}.${body}`, NOW), null);
  assert.equal(await verifyToken('segredo', 'lixo', NOW), null);
});

test('código premium: gera, verifica, expira, revoga e rejeita adulteração', async () => {
  const { code, expiresAt } = await generateCode('seg', 30, NOW);
  assert.match(code, /^TD-[A-Z2-9]{6}-\d{8}-[A-F0-9]{10}$/);
  assert.ok(expiresAt > NOW + 29 * 86_400_000);
  const ok = await verifyCode('seg', code.toLowerCase(), NOW);
  assert.ok(ok);
  assert.equal(await verifyCode('outro', code, NOW), null);
  assert.equal(await verifyCode('seg', code, NOW + 40 * 86_400_000), null);
  assert.equal(await verifyCode('seg', code, NOW, [ok.id]), null);
  assert.equal(await verifyCode('seg', code.replace(/-\d{8}-/, '-20991231-'), NOW), null);
  assert.equal(await verifyCode('seg', 'TD-AAAAAA-20261231-0000000000', NOW), null);
});

test('resgate: master, premium e código errado', async () => {
  const env = baseEnv();
  const m = await redeem(env, ' my-master-code-123 ', NOW);
  assert.equal(m?.plan, 'master');
  assert.equal((await redeem(env, 'my-master-code-124', NOW)), null);
  const { code } = await generateCode(env.AUTH_SECRET!, 7, NOW);
  assert.equal((await redeem(env, code, NOW))?.plan, 'premium');
  assert.equal(await redeem({ ...env, AUTH_SECRET: undefined }, 'my-master-code-123', NOW), null);
});

test('/redeem: devolve token, recusa código ruim e limita tentativas por IP', async () => {
  const env = { ...baseEnv(), USAGE: memoryUsage() };
  const ok = await handle(req('/redeem', { code: 'my-master-code-123' }), env, geminiReturns({}), NOW);
  assert.equal(ok.status, 200);
  assert.equal(((await ok.json()) as { plan: string }).plan, 'master');
  const bad = await handle(req('/redeem', { code: 'nope' }), env, geminiReturns({}), NOW);
  assert.equal(bad.status, 403);
  assert.equal((await handle(req('/redeem', {}), env, geminiReturns({}), NOW)).status, 400);
  assert.equal((await handle(req('/redeem', { code: 'x' }), { ...env, AUTH_SECRET: undefined }, geminiReturns({}), NOW)).status, 503);
  let last = 0;
  for (let i = 0; i < 25; i++) {
    last = (await handle(req('/redeem', { code: 'x' }, { 'cf-connecting-ip': '1.2.3.4' }), env, geminiReturns({}), NOW)).status;
  }
  assert.equal(last, 429);
});

// ---------------- planos: o que cada um acessa ----------------

const coachBody = { words: ['go', 'park'], history: [], accent: 'en-US' };
const chatBody = { history: [{ role: 'ai', text: 'Hi! How are you?' }], userText: 'I am fine', accent: 'en-US', words: ['go'] };
const coachOk = { coach: 'Where do you go today?', coachPt: 'Aonde você vai hoje?', suggestion: 'I go to the park.' };
const chatOk = { segments: [{ lang: 'en', text: 'Great! What do you do today?' }], nextListen: 'en', end: false };

test('free não acessa /coach nem /chat (premium_required)', async () => {
  const env = baseEnv();
  for (const [path, body] of [['/coach', coachBody], ['/chat', chatBody]] as const) {
    const r = await handle(req(path, body), env, geminiReturns({}), NOW);
    assert.equal(r.status, 403, path);
    assert.deepEqual(await r.json(), { error: 'premium_required' });
  }
});

test('premium e master acessam /coach e /chat', async () => {
  const env = baseEnv();
  for (const plan of ['premium', 'master'] as const) {
    const h = { authorization: `Bearer ${await tokenFor(env, plan)}` };
    const c = await handle(req('/coach', coachBody, h), env, geminiReturns(coachOk), NOW);
    assert.equal(c.status, 200, plan);
    assert.deepEqual(await c.json(), coachOk);
    const t = await handle(req('/chat', chatBody, h), env, geminiReturns(chatOk), NOW);
    assert.equal(t.status, 200, plan);
  }
});

test('token inválido ou vencido = 401 token_invalid; sem AUTH_SECRET nada premium passa', async () => {
  const env = baseEnv();
  const r = await handle(req('/chat', chatBody, { authorization: 'Bearer lixo' }), env, geminiReturns(chatOk), NOW);
  assert.equal(r.status, 401);
  assert.deepEqual(await r.json(), { error: 'token_invalid' });
  const token = await tokenFor(env, 'premium');
  const later = await handle(req('/chat', chatBody, { authorization: `Bearer ${token}` }), env, geminiReturns(chatOk), NOW + 40 * 86_400_000);
  assert.equal(later.status, 401);
  const noSecret = await handle(req('/chat', chatBody, { authorization: `Bearer ${token}` }), { ...env, AUTH_SECRET: undefined }, geminiReturns(chatOk), NOW);
  assert.equal(noSecret.status, 401);
});

test('/admin/code: só o master gera código, e o código gerado funciona', async () => {
  const env = baseEnv();
  const premium = { authorization: `Bearer ${await tokenFor(env, 'premium')}` };
  assert.equal((await handle(req('/admin/code', { days: 7 }, premium), env, geminiReturns({}), NOW)).status, 403);
  assert.equal((await handle(req('/admin/code', { days: 7 }), env, geminiReturns({}), NOW)).status, 403);
  const master = { authorization: `Bearer ${await tokenFor(env, 'master')}` };
  assert.equal((await handle(req('/admin/code', { days: 0 }, master), env, geminiReturns({}), NOW)).status, 400);
  assert.equal((await handle(req('/admin/code', { days: 366 }, master), env, geminiReturns({}), NOW)).status, 400);
  const res = await handle(req('/admin/code', { days: 7 }, master), env, geminiReturns({}), NOW);
  assert.equal(res.status, 200);
  const { code } = (await res.json()) as { code: string };
  assert.equal((await redeem(env, code, NOW))?.plan, 'premium');
});

// ---------------- /check: limite diário do free ----------------

const checkBody = { mode: 'sentence', sentence: 'I am happy', targetWords: ['I'], accent: 'en-US' };
const checkOk = { correct: true, corrected: 'I am happy.', explanationPt: '', issues: [], natural: '', replyEn: '', replyPt: '' };

test('/check no free exige id do aparelho e conta o uso', async () => {
  const usage = memoryUsage();
  const env = { ...baseEnv(), USAGE: usage };
  assert.equal((await handle(req('/check', checkBody), env, geminiReturns(checkOk), NOW)).status, 400);
  const r = await handle(req('/check', checkBody, { 'x-device-id': DEVICE }), env, geminiReturns(checkOk), NOW);
  assert.equal(r.status, 200);
  const data = (await r.json()) as { usage: { used: number; limit: number } };
  assert.deepEqual(data.usage, { used: 1, limit: FREE_DAILY_LIMIT });
});

test('/check no free: passou de 30 no dia = 429 com horário de reset; no dia seguinte volta', async () => {
  const usage = memoryUsage();
  const env = { ...baseEnv(), USAGE: usage };
  const h = { 'x-device-id': DEVICE };
  let last: Response | undefined;
  for (let i = 0; i < FREE_DAILY_LIMIT; i++) last = await handle(req('/check', checkBody, h), env, geminiReturns(checkOk), NOW);
  assert.equal(last!.status, 200);
  const over = await handle(req('/check', checkBody, h), env, geminiReturns(checkOk), NOW);
  assert.equal(over.status, 429);
  const body = (await over.json()) as { error: string; limit: number; resetsAt: number };
  assert.equal(body.error, 'daily_limit');
  assert.equal(body.limit, FREE_DAILY_LIMIT);
  assert.ok(body.resetsAt > NOW && body.resetsAt - NOW <= 86_400_000);
  const tomorrow = await handle(req('/check', checkBody, h), env, geminiReturns(checkOk), body.resetsAt + 1000);
  assert.equal(tomorrow.status, 200);
  assert.notEqual(usageDay(NOW), usageDay(body.resetsAt + 1000));
  // outro aparelho não é afetado
  const other = await handle(req('/check', checkBody, { 'x-device-id': 'other-device-12345678' }), env, geminiReturns(checkOk), NOW);
  assert.equal(other.status, 200);
});

test('/check no premium não tem limite nem exige id do aparelho', async () => {
  const usage = memoryUsage();
  const env = { ...baseEnv(), USAGE: usage };
  const h = { authorization: `Bearer ${await tokenFor(env, 'premium')}` };
  for (let i = 0; i < FREE_DAILY_LIMIT + 5; i++) {
    const r = await handle(req('/check', checkBody, h), env, geminiReturns(checkOk), NOW);
    assert.equal(r.status, 200);
  }
  assert.equal(usage.counts.size, 0);
});

// ---------------- /check: análise completa da frase ----------------

test('check: valida entradas e nível', () => {
  assert.equal(parseCheckRequest({ ...checkBody, sentence: 'x'.repeat(201) }).ok, false);
  assert.equal(parseCheckRequest({ ...checkBody, targetWords: [] }).ok, false);
  assert.equal(parseCheckRequest({ ...checkBody, mode: 'conversation' }).ok, false);
  assert.equal(parseCheckRequest({ ...checkBody, sentence: '   ' }).ok, false);
  const r = parseCheckRequest({ ...checkBody, level: 'B1' });
  assert.ok(r.ok);
  assert.equal(r.value.level, 'B1');
  const bad = parseCheckRequest({ ...checkBody, level: 'Z9' });
  assert.ok(bad.ok);
  assert.equal(bad.value.level, undefined);
});

test('check: o prompt pede análise completa e leva o nível', () => {
  const r = parseCheckRequest({ ...checkBody, level: 'B2' });
  assert.ok(r.ok);
  assert.match(buildUserPrompt(r.value), /nível do aluno: B2/);
});

test('check: devolve problemas da frase inteira e a forma mais natural', async () => {
  const env = baseEnv();
  const wrong = {
    correct: false,
    corrected: 'I took a photo of the park.',
    explanationPt: 'Em inglês dizemos "take a photo" e o verbo vai para o passado.',
    issues: [
      { type: 'word-choice', original: 'make a photo', fix: 'take a photo', explanationPt: 'A combinação correta é "take a photo".' },
      { type: 'grammar', original: 'make', fix: 'took', explanationPt: 'A ação já aconteceu, então use o passado.' },
      { type: 'naturalness', original: 'of the park', fix: 'at the park', explanationPt: 'Soa mais natural.' },
    ],
    natural: 'I took a picture at the park.',
    replyEn: '',
    replyPt: '',
  };
  const r = await handle(req('/check', { ...checkBody, sentence: 'I make a photo of the park yesterday' }, { 'x-device-id': DEVICE }), env, geminiReturns(wrong), NOW);
  const data = (await r.json()) as { correct: boolean; issues: { type: string }[]; natural: string };
  assert.equal(data.correct, false);
  assert.deepEqual(data.issues.map((i) => i.type), ['word-choice', 'grammar', 'naturalness']);
  assert.equal(data.natural, 'I took a picture at the park.');
});

test('check: modelo diz correto mas aponta erro = a frase reprova; só naturalness aprova', () => {
  const p = parseCheckRequest(checkBody);
  assert.ok(p.ok);
  const issue = (type: string) => ({ type, original: 'a', fix: 'b', explanationPt: 'Porque sim.' });
  const wrong = normalizeResult({ correct: true, corrected: 'I am happy.', explanationPt: '', issues: [issue('grammar')] }, p.value);
  assert.equal(wrong?.correct, false);
  assert.equal(wrong?.explanationPt, 'Porque sim.');
  const tip = normalizeResult({ correct: true, corrected: 'I am happy.', explanationPt: '', issues: [issue('naturalness')], natural: 'I am glad.' }, p.value);
  assert.equal(tip?.correct, true);
  assert.equal(tip?.natural, 'I am glad.');
  assert.equal(tip?.issues?.length, 1);
});

test('check: limpa lixo, limita a 4 problemas e exige explicação quando erra', () => {
  const p = parseCheckRequest(checkBody);
  assert.ok(p.ok);
  const many = Array.from({ length: 7 }, () => ({ type: 'grammar', original: 'a', fix: 'b', explanationPt: 'x' }));
  const r = normalizeResult({ correct: false, corrected: 'I am happy.', explanationPt: 'ok', issues: [...many, { type: 'foo' }, 5] }, p.value);
  assert.equal(r?.issues?.length, 4);
  assert.equal(normalizeResult({ correct: false, corrected: 'x', explanationPt: '', issues: [] }, p.value), null);
  assert.equal(normalizeResult({ correct: 'sim' }, p.value), null);
  const same = normalizeResult({ correct: true, corrected: 'I am happy.', explanationPt: '', natural: 'i am happy.' }, p.value);
  assert.equal(same?.natural, undefined);
});

test('check: acerto na conversa inclui reply; falha da IA vira 502', async () => {
  const env = baseEnv();
  const body = { ...checkBody, mode: 'conversation', context: 'How are you?' };
  const ok = { ...checkOk, replyEn: 'Great!', replyPt: 'Ótimo!' };
  const r = await handle(req('/check', body, { 'x-device-id': DEVICE }), env, geminiReturns(ok), NOW);
  assert.deepEqual(((await r.json()) as { reply: unknown }).reply, { en: 'Great!', pt: 'Ótimo!' });
  const f = await handle(req('/check', checkBody, { 'x-device-id': DEVICE }), env, failing, NOW);
  assert.equal(f.status, 502);
  assert.deepEqual(await f.json(), { error: 'falha na IA' });
});

// ---------------- /coach e /chat: validação ----------------

test('coach: valida entradas, tema, repetição e resposta-modelo', () => {
  assert.equal(parseCoachRequest({ ...coachBody, words: [] }).ok, false);
  assert.equal(parseCoachRequest({ ...coachBody, history: [1, 2, 3, 4] }).ok, false);
  assert.equal(parseCoachRequest({ ...coachBody, history: [{ coach: 'a', student: 'b' }] }).ok, true);
  const t = parseCoachRequest({ ...coachBody, topic: 'asking for help' });
  assert.ok(t.ok);
  assert.equal(t.value.topic, 'asking for help');
  assert.equal(parseCoachRequest({ ...coachBody, topic: 'x'.repeat(121) }).ok, false);
  const req1 = parseCoachRequest(coachBody);
  assert.ok(req1.ok);
  assert.equal(normalizeCoach({ coach: 'How are you?', coachPt: 'Como vai?', suggestion: 'I am fine.' }, req1.value), null);
  const dup = parseCoachRequest({ ...coachBody, history: [{ coach: 'Where do you go?', student: 'I go home.' }] });
  assert.ok(dup.ok);
  assert.equal(normalizeCoach({ coach: 'where do you go?', coachPt: 'x', suggestion: 'I go home.' }, dup.value), null);
});

test('chat: abrir conversa, validar entradas e normalizar segmentos', () => {
  const r = parseChatRequest({ accent: 'en-GB' });
  assert.ok(r.ok);
  assert.match(buildChatPrompt(r.value), /comece a conversa/);
  assert.equal(parseChatRequest({ ...chatBody, history: Array(13).fill({ role: 'ai', text: 'a' }) }).ok, false);
  assert.equal(parseChatRequest({ ...chatBody, history: [{ role: 'bot', text: 'a' }] }).ok, false);
  assert.equal(parseChatRequest({ ...chatBody, userText: 'x'.repeat(301) }).ok, false);
  assert.equal(parseChatRequest({ ...chatBody, confidence: 2 }).ok, false);
  assert.equal(parseChatRequest({ ...chatBody, silence: true }).ok, false);
  assert.equal(parseChatRequest({ ...chatBody, words: Array(41).fill('a') }).ok, false);
  assert.equal(parseChatRequest({ history: [], silence: true }).ok, true);
  assert.equal(normalizeChat({ segments: [] }), null);
  assert.equal(normalizeChat({ segments: [{ lang: 'fr', text: 'Salut' }] }), null);
  assert.equal(normalizeChat({ segments: Array(5).fill({ lang: 'en', text: 'Hi' }) }), null);
  assert.deepEqual(normalizeChat({ segments: [{ lang: 'pt', text: ' Tudo bem?  ' }] }), { segments: [{ lang: 'pt', text: 'Tudo bem?' }], nextListen: 'en', end: false });
});

test('chat: aceita corpo maior que 4 KB mas não o de 9 KB', async () => {
  const env = baseEnv();
  const h = { authorization: `Bearer ${await tokenFor(env, 'premium')}` };
  const big = new Request('https://x/chat', { method: 'POST', body: '{}', headers: { ...h, 'content-length': '6000' } });
  assert.notEqual((await handle(big, env, geminiReturns({}), NOW)).status, 413);
  const huge = new Request('https://x/chat', { method: 'POST', body: '{}', headers: { ...h, 'content-length': '9000' } });
  assert.equal((await handle(huge, env, geminiReturns({}), NOW)).status, 413);
});
