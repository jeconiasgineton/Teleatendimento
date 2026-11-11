import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AccountDO, LOCK_MS, MAX_FAILS } from '../src/accountDo.ts';
import { accountKey, emailHint, normalizeEmail, normalizePhone, parseProgressData, passwordProblem, phoneHint } from '../src/account.ts';
import { generateCode, redeem, signSession, signToken, verifySession } from '../src/auth.ts';
import { handle } from '../src/index.ts';
import type { Env, UsageNamespace } from '../src/types.ts';

const NOW = Date.UTC(2026, 10, 11, 15, 0, 0);
const SECRET = 's'.repeat(40);

/** Durable Objects de mentira: a classe AccountDO é a real; só o armazenamento é em memória. */
function memoryAccounts(): UsageNamespace & { dump: () => string } {
  const objects = new Map<string, { instance: AccountDO; store: Map<string, unknown> }>();
  return {
    idFromName: (n: string) => n,
    get: (id: unknown) => {
      const name = String(id);
      if (!objects.has(name)) {
        const store = new Map<string, unknown>();
        const storage = {
          get: async <T>(k: string) => (store.has(k) ? (structuredClone(store.get(k)) as T) : undefined),
          put: async (k: string, v: unknown) => void store.set(k, structuredClone(v)),
        };
        objects.set(name, { instance: new AccountDO({ storage }), store });
      }
      return { fetch: (r: Request) => objects.get(name)!.instance.fetch(r) };
    },
    dump: () => JSON.stringify([...objects].map(([n, o]) => [n, [...o.store]])),
  };
}

function memoryUsage(): UsageNamespace {
  const counts = new Map<string, number>();
  return {
    idFromName: (n: string) => n,
    get: (id: unknown) => ({
      fetch: async () => {
        counts.set(String(id), (counts.get(String(id)) ?? 0) + 1);
        return new Response(String(counts.get(String(id))));
      },
    }),
  };
}

const mkEnv = (): Env & { ACCOUNTS: ReturnType<typeof memoryAccounts> } => ({
  GEMINI_API_KEY: 'k',
  AUTH_SECRET: SECRET,
  MASTER_CODE: 'master-code-xyz',
  ACCOUNTS: memoryAccounts(),
});

const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`https://x${path}`, { method: 'POST', body: JSON.stringify(body), headers });
const run = (env: Env, path: string, body: unknown, headers: Record<string, string> = {}, now = NOW) =>
  handle(post(path, body, headers), env, (async () => new Response('{}')) as typeof fetch, now);

const progress = (learned: string[] = ['i', 'you']) => ({
  version: 1,
  startedAt: NOW - 86_400_000,
  epoch: 0,
  completed: { '1': { score: 100, at: NOW - 1000 } },
  learned,
  reviews: { i: { wordId: 'i', box: 1, due: NOW + 1000, lapses: 0, lastReviewed: NOW } },
  practice: { 'vocab-1': { best: 80, at: NOW } },
});

const creds = { email: 'Ana@Example.com ', phone: '(11) 98888-7777', password: 'senha-forte-1' };

// ---------------- normalização ----------------

test('e-mail: minúsculo, sem espaços e formato válido', () => {
  assert.equal(normalizeEmail(' Ana@Example.COM '), 'ana@example.com');
  for (const bad of ['ana', 'ana@', '@x.com', 'a b@x.com', 'ana@x', 5, null, 'a'.repeat(130) + '@x.com']) assert.equal(normalizeEmail(bad), null, String(bad));
});

test('celular: só dígitos; sem "+" assume Brasil; com "+" é internacional', () => {
  assert.equal(normalizePhone('(11) 98888-7777'), '5511988887777');
  assert.equal(normalizePhone('011 98888-7777'), '5511988887777');
  assert.equal(normalizePhone('+55 11 98888-7777'), '5511988887777');
  assert.equal(normalizePhone('+1 (555) 123-4567'), '15551234567');
  assert.equal(normalizePhone('5511988887777'), '5511988887777');
  for (const bad of ['123', '', 'abc', null, '+1' + '2'.repeat(20)]) assert.equal(normalizePhone(bad), null, String(bad));
});

test('mesmo contato escrito de jeitos diferentes = mesma chave; qualquer diferença = chave outra', async () => {
  const a = await accountKey(SECRET, 'ana@example.com', '5511988887777');
  assert.match(a, /^[0-9a-f]{64}$/);
  assert.equal(a, await accountKey(SECRET, 'ana@example.com', '5511988887777'));
  assert.notEqual(a, await accountKey(SECRET, 'ana@example.com', '5511988887778'));
  assert.notEqual(a, await accountKey(SECRET, 'ana2@example.com', '5511988887777'));
  assert.notEqual(a, await accountKey('outro-segredo', 'ana@example.com', '5511988887777'));
  assert.equal(emailHint('ana@example.com'), 'a***@example.com');
  assert.equal(phoneHint('5511988887777'), '***-7777');
});

test('senha: 8 a 72 caracteres, sem repetição e diferente do e-mail', () => {
  assert.equal(passwordProblem('senha-forte-1', 'a@b.com'), null);
  for (const bad of ['curta', 'x'.repeat(73), 'aaaaaaaaaa', 'a@b.com', 12345678, undefined]) assert.equal(passwordProblem(bad, 'a@b.com'), 'weak_password', String(bad));
});

// ---------------- cadastro, login e histórico ----------------

test('cadastro com o histórico do aparelho; login em outro aparelho recupera tudo', async () => {
  const env = mkEnv();
  const up = await run(env, '/account/signup', { ...creds, data: progress() });
  assert.equal(up.status, 200);
  const created = (await up.json()) as { session: { token: string }; version: number; data: { learned: string[] }; emailHint: string; phoneHint: string };
  assert.equal(created.version, 1);
  assert.deepEqual(created.data.learned, ['i', 'you']);
  assert.equal(created.emailHint, 'a***@example.com');
  assert.equal(created.phoneHint, '***-7777');

  // outro aparelho: mesmos dados escritos de outro jeito
  const login = await run(env, '/account/login', { email: 'ana@example.com', phone: '+55 11 98888 7777', password: creds.password });
  assert.equal(login.status, 200);
  const back = (await login.json()) as { data: { learned: string[]; completed: Record<string, unknown> } };
  assert.deepEqual(back.data.learned, ['i', 'you']);
  assert.ok(back.data.completed['1']);
});

test('outro e-mail OU outro celular = outra conta, começa do zero', async () => {
  const env = mkEnv();
  await run(env, '/account/signup', { ...creds, data: progress() });
  // mesmo e-mail e senha, celular diferente: não entra na conta da Ana
  const wrongPhone = await run(env, '/account/login', { email: creds.email, phone: '11977776666', password: creds.password });
  assert.equal(wrongPhone.status, 401);
  // e pode criar a sua própria conta, sem nenhum histórico
  const fresh = await run(env, '/account/signup', { email: creds.email, phone: '11977776666', password: 'outra-senha-9' });
  assert.equal(fresh.status, 200);
  const body = (await fresh.json()) as { version: number; data: unknown };
  assert.equal(body.data, null);
  assert.equal(body.version, 0);
  // com outro e-mail também
  const otherMail = await run(env, '/account/signup', { email: 'bia@example.com', phone: creds.phone, password: 'outra-senha-9' });
  assert.equal(((await otherMail.json()) as { data: unknown }).data, null);
});

test('senha errada e conta inexistente dão a mesma resposta', async () => {
  const env = mkEnv();
  await run(env, '/account/signup', creds);
  const wrong = await run(env, '/account/login', { ...creds, password: 'senha-errada-1' });
  const ghost = await run(env, '/account/login', { email: 'ghost@example.com', phone: creds.phone, password: 'senha-errada-1' });
  assert.equal(wrong.status, 401);
  assert.equal(ghost.status, 401);
  assert.deepEqual(await wrong.json(), await ghost.json());
});

test('conta duplicada: 409; dados inválidos: 400', async () => {
  const env = mkEnv();
  assert.equal((await run(env, '/account/signup', creds)).status, 200);
  const dup = await run(env, '/account/signup', { ...creds, password: 'outra-senha-9' });
  assert.equal(dup.status, 409);
  assert.deepEqual(await dup.json(), { error: 'account_exists' });
  // a senha original continua valendo (o segundo cadastro não sobrescreve nada)
  assert.equal((await run(env, '/account/login', creds)).status, 200);
  assert.equal(((await (await run(env, '/account/signup', { ...creds, email: 'x' })).json()) as { error: string }).error, 'invalid_email');
  assert.equal(((await (await run(env, '/account/signup', { ...creds, phone: '1' })).json()) as { error: string }).error, 'invalid_phone');
  assert.equal(((await (await run(env, '/account/signup', { ...creds, email: 'n@x.com', password: '123' })).json()) as { error: string }).error, 'weak_password');
  assert.equal(((await (await run(env, '/account/signup', { ...creds, email: 'n@x.com', data: { version: 9 } })).json()) as { error: string }).error, 'invalid_data');
});

test('bloqueio: 5 senhas erradas travam a conta por 15 minutos, até para a senha certa', async () => {
  const env = mkEnv();
  await run(env, '/account/signup', creds);
  for (let i = 0; i < MAX_FAILS; i++) assert.equal((await run(env, '/account/login', { ...creds, password: 'errada-12345' })).status, 401);
  const locked = await run(env, '/account/login', creds);
  assert.equal(locked.status, 429);
  assert.equal(((await locked.json()) as { error: string }).error, 'locked');
  assert.equal((await run(env, '/account/login', creds, {}, NOW + LOCK_MS - 1000)).status, 429);
  assert.equal((await run(env, '/account/login', creds, {}, NOW + LOCK_MS + 1000)).status, 200);
});

test('limite de tentativas por IP', async () => {
  const env = { ...mkEnv(), USAGE: memoryUsage() };
  let last = 0;
  for (let i = 0; i < 101; i++) last = (await run(env, '/account/login', { ...creds, password: 'x'.repeat(10) }, { 'cf-connecting-ip': '9.9.9.9' })).status;
  assert.equal(last, 429);
});

test('o servidor não guarda e-mail, celular nem senha legíveis', async () => {
  const env = mkEnv();
  await run(env, '/account/signup', { ...creds, data: progress() });
  const dump = env.ACCOUNTS.dump();
  for (const secret of ['example.com', 'ana@', '988887777', '98888', creds.password, 'senha-forte']) assert.ok(!dump.includes(secret), secret);
});

test('sem AUTH_SECRET ou sem ACCOUNTS: 503', async () => {
  assert.equal((await run({ ...mkEnv(), AUTH_SECRET: undefined }, '/account/login', creds)).status, 503);
  assert.equal((await run({ ...mkEnv(), ACCOUNTS: undefined }, '/account/login', creds)).status, 503);
});

// ---------------- sincronização ----------------

async function signedUp(env: Env, data = progress()) {
  const r = await run(env, '/account/signup', { ...creds, data });
  return ((await r.json()) as { session: { token: string; expiresAt: number } }).session;
}

test('sessão: ler e gravar com versão; conflito devolve o dado do servidor', async () => {
  const env = mkEnv();
  const { token } = await signedUp(env);
  const h = { 'x-session': token };
  const got = (await (await run(env, '/account/get', {}, h)).json()) as { version: number; data: { learned: string[] } };
  assert.equal(got.version, 1);

  const ok = await run(env, '/account/put', { baseVersion: 1, data: progress(['i', 'you', 'is']) }, h);
  assert.equal(ok.status, 200);
  assert.deepEqual(await ok.json(), { version: 2 });

  // outro aparelho ainda na versão 1: conflito, recebe o que está no servidor
  const stale = await run(env, '/account/put', { baseVersion: 1, data: progress(['i']) }, h);
  assert.equal(stale.status, 409);
  const conflict = (await stale.json()) as { error: string; version: number; data: { learned: string[] } };
  assert.equal(conflict.error, 'version_conflict');
  assert.equal(conflict.version, 2);
  assert.deepEqual(conflict.data.learned, ['i', 'you', 'is']);
});

test('sessão: token adulterado, vencido, de outro tipo ou ausente = 401', async () => {
  const env = mkEnv();
  const { token } = await signedUp(env);
  for (const bad of ['', 'lixo', token.slice(0, -3) + 'abc']) {
    assert.equal((await run(env, '/account/get', {}, { 'x-session': bad })).status, 401);
  }
  assert.equal((await run(env, '/account/get', {}, { 'x-session': token }, NOW + 181 * 86_400_000)).status, 401);
  // token de plano (premium) não serve como sessão de conta
  const premium = (await redeem(env, (await generateCode(SECRET, 30, NOW)).code, NOW))!.token;
  assert.equal((await run(env, '/account/get', {}, { 'x-session': premium })).status, 401);
  // e a sessão de conta não vale como plano premium
  const chat = await handle(post('/chat', { history: [], accent: 'en-US', words: [] }, { authorization: `Bearer ${token}` }), env, (async () => new Response('{}')) as typeof fetch, NOW);
  assert.equal(chat.status, 401);
  assert.equal(await verifySession(SECRET, await signToken(SECRET, { p: 'premium', e: 9_999_999_999, c: 'X' }), NOW), null);
});

test('sessão de uma conta não acessa outra', async () => {
  const env = mkEnv();
  const a = await signedUp(env, progress(['i']));
  await run(env, '/account/signup', { email: 'bia@example.com', phone: '11977776666', password: 'senha-forte-2', data: progress(['x1', 'x2', 'x3']) });
  const mine = (await (await run(env, '/account/get', {}, { 'x-session': a.token })).json()) as { data: { learned: string[] } };
  assert.deepEqual(mine.data.learned, ['i']);
  const forged = await signSession('outro-segredo', { a: 'f'.repeat(64), e: Math.floor(NOW / 1000) + 1000 });
  assert.equal((await run(env, '/account/get', {}, { 'x-session': forged })).status, 401);
});

test('renovar a sessão', async () => {
  const env = mkEnv();
  const { token } = await signedUp(env);
  const r = await run(env, '/account/refresh', {}, { 'x-session': token }, NOW + 100 * 86_400_000);
  assert.equal(r.status, 200);
  const fresh = ((await r.json()) as { session: { token: string; expiresAt: number } }).session;
  assert.ok(fresh.expiresAt > NOW + 270 * 86_400_000);
  assert.equal((await run(env, '/account/get', {}, { 'x-session': fresh.token }, NOW + 200 * 86_400_000)).status, 200);
});

test('histórico inválido ou grande demais é recusado', async () => {
  const env = mkEnv();
  const { token } = await signedUp(env);
  const h = { 'x-session': token };
  const put = (data: unknown, baseVersion = 1) => run(env, '/account/put', { baseVersion, data }, h);
  assert.equal((await put({ ...progress(), learned: Array(601).fill('a') })).status, 400);
  assert.equal((await put({ ...progress(), learned: [5] })).status, 400);
  assert.equal((await put({ ...progress(), reviews: { x: { wordId: 'x', box: 99, due: 1, lapses: 0, lastReviewed: null } } })).status, 400);
  assert.equal((await put({ ...progress(), startedAt: 'ontem' })).status, 400);
  assert.equal((await run(env, '/account/put', { data: progress() }, h)).status, 400);
  const huge = new Request('https://x/account/put', { method: 'POST', body: '{}', headers: { ...h, 'content-length': '200000' } });
  assert.equal((await handle(huge, env, (async () => new Response('{}')) as typeof fetch, NOW)).status, 413);
});

test('parseProgressData limpa e aceita estado antigo sem época nem prática', () => {
  const { epoch, practice, ...old } = progress();
  void epoch; void practice;
  const p = parseProgressData(old);
  assert.equal(p?.epoch, 0);
  assert.deepEqual(p?.practice, {});
  assert.equal(parseProgressData({ ...progress(), completed: { '1': { score: 500, at: 1 } } })?.completed['1'].score, 100);
  assert.equal(parseProgressData(null), null);
});
