import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useProgress } from '@/context/ProgressContext';
import { initialProgress, type ProgressState } from '@/domain/progress';
import { fingerprint, isEmptyProgress, mergeProgress, normalizeProgress } from '@/domain/sync';
import {
  clearAccount, fetchData, loadAccount, logIn, putData, refreshSession, saveAccount, signUp,
  type AccountError, type Entered, type StoredAccount,
} from '@/services/account';

const PUSH_DELAY_MS = 2500;
const REFRESH_WHEN_LEFT_MS = 60 * 24 * 3600_000;

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'expired';

interface Account {
  loaded: boolean;
  /** Entrou numa conta? Sem conta = modo convidado (só neste aparelho). */
  signedIn: boolean;
  emailHint: string | null;
  phoneHint: string | null;
  sync: SyncStatus;
  signUp: (email: string, phone: string, password: string) => Promise<{ ok: true } | { ok: false; error: AccountError; retryAfterMs?: number }>;
  logIn: (email: string, phone: string, password: string) => Promise<{ ok: true } | { ok: false; error: AccountError; retryAfterMs?: number }>;
  /** Sai da conta e volta este aparelho ao início (o histórico fica na nuvem). */
  logOut: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const Ctx = createContext<Account | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, loaded: progressLoaded, replaceState } = useProgress();
  const [stored, setStored] = useState<StoredAccount | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sync, setSyncState] = useState<SyncStatus>('idle');
  const setSync = useCallback((s: SyncStatus | ((prev: SyncStatus) => SyncStatus)) => {
    setSyncState((prev) => {
      const next = typeof s === 'function' ? s(prev) : s;
      syncRef.current = next;
      return next;
    });
  }, []);

  // Referências: o motor de sincronização roda fora do ciclo de renderização.
  const storedRef = useRef(stored);
  storedRef.current = stored;
  const stateRef = useRef(state);
  stateRef.current = state;
  /** Estado que o servidor já tem (para saber se há algo novo a enviar). */
  const syncedFp = useRef('');
  const busy = useRef(false);
  const syncRef = useRef<SyncStatus>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback(async (next: StoredAccount | null) => {
    setStored(next);
    storedRef.current = next;
    if (next) await saveAccount(next);
    else await clearAccount();
  }, []);

  const adopt = useCallback(
    (s: ProgressState) => {
      replaceState(s);
      stateRef.current = normalizeProgress(s);
      syncedFp.current = fingerprint(normalizeProgress(s));
    },
    [replaceState],
  );

  /** Envia o estado local. Se outro aparelho gravou antes, junta e tenta de novo. */
  const push = useCallback(async (): Promise<void> => {
    const acc = storedRef.current;
    if (!acc || busy.current) return;
    busy.current = true;
    setSync('syncing');
    try {
      let version = acc.version;
      for (let attempt = 0; attempt < 3; attempt++) {
        const local = stateRef.current;
        if (fingerprint(local) === syncedFp.current && attempt === 0) {
          setSync('idle');
          return;
        }
        const r = await putData(acc.token, local, version);
        if (r.ok) {
          version = r.version;
          syncedFp.current = fingerprint(local);
          await persist({ ...acc, version });
          setSync('idle');
          return;
        }
        if ('conflict' in r) {
          version = r.conflict.version;
          const merged = r.conflict.data ? mergeProgress(r.conflict.data, local) : local;
          replaceState(merged);
          stateRef.current = normalizeProgress(merged);
          continue;
        }
        setSync(r.error === 'session_invalid' ? 'expired' : 'error');
        return;
      }
      setSync('error');
    } finally {
      busy.current = false;
    }
  }, [persist, replaceState, setSync]);

  /** Busca o que está na nuvem e junta com o que há neste aparelho. */
  const pull = useCallback(async (): Promise<void> => {
    const acc = storedRef.current;
    if (!acc || busy.current) return;
    setSync('syncing');
    const r = await fetchData(acc.token);
    if (!r.ok) {
      setSync(r.error === 'session_invalid' ? 'expired' : 'error');
      return;
    }
    const local = stateRef.current;
    const merged = r.data ? mergeProgress(r.data, local) : local;
    syncedFp.current = r.data ? fingerprint(normalizeProgress(r.data)) : '';
    await persist({ ...acc, version: r.version });
    if (fingerprint(normalizeProgress(merged)) !== fingerprint(local)) {
      replaceState(merged);
      stateRef.current = normalizeProgress(merged);
    }
    await push();
    if (!busy.current) setSync((s) => (s === 'syncing' ? 'idle' : s));
  }, [persist, push, replaceState, setSync]);

  const renewIfNeeded = useCallback(async () => {
    const acc = storedRef.current;
    if (!acc || acc.expiresAt - Date.now() > REFRESH_WHEN_LEFT_MS) return;
    const r = await refreshSession(acc.token);
    if (r.ok) await persist({ ...acc, ...r.session });
    else if (r.error === 'session_invalid') setSync('expired');
  }, [persist, setSync]);

  // Ao abrir o app: carrega a sessão guardada, renova e sincroniza.
  useEffect(() => {
    if (!progressLoaded) return;
    let alive = true;
    (async () => {
      const acc = await loadAccount();
      if (!alive) return;
      if (acc) {
        setStored(acc);
        storedRef.current = acc;
        setLoaded(true);
        await renewIfNeeded();
        await pull();
      } else {
        setLoaded(true);
      }
    })();
    return () => {
      alive = false;
    };
    // roda uma vez quando o progresso local termina de carregar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressLoaded]);

  // Mudou algo localmente: envia depois de uns segundos (junta várias mudanças numa só).
  // Depois de uma falha só tenta de novo na próxima mudança ou ao voltar para o app (sem laço de tentativas).
  useEffect(() => {
    if (!stored || syncRef.current === 'expired' || !loaded) return;
    if (fingerprint(state) === syncedFp.current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void push(), PUSH_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [state, stored, loaded, push]);

  // Ao voltar para o app, traz o que outro aparelho fez.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && storedRef.current) void renewIfNeeded().then(pull);
    });
    return () => sub.remove();
  }, [pull, renewIfNeeded]);

  const finish = useCallback(
    async (e: Entered, mergedLocal: ProgressState | null) => {
      await persist({ ...e.session, version: e.version, emailHint: e.emailHint, phoneHint: e.phoneHint });
      setSync('idle');
      adopt(mergedLocal ?? (e.data ? normalizeProgress(e.data) : initialProgress(Date.now())));
    },
    [adopt, persist, setSync],
  );

  const doSignUp = useCallback<Account['signUp']>(
    async (email, phone, password) => {
      // O histórico deste aparelho (modo convidado) vai para a conta nova.
      const local = stateRef.current;
      const r = await signUp(email, phone, password, isEmptyProgress(local) ? undefined : local);
      if (!r.ok) return r;
      await finish(r, isEmptyProgress(local) ? null : local);
      return { ok: true };
    },
    [finish],
  );

  const doLogIn = useCallback<Account['logIn']>(
    async (email, phone, password) => {
      const r = await logIn(email, phone, password);
      if (!r.ok) return r;
      // Entrar numa conta mostra o histórico DELA, não o do aparelho.
      await finish(r, null);
      return { ok: true };
    },
    [finish],
  );

  const logOut = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await push(); // salva o que ainda não foi enviado
    await persist(null);
    setSync('idle');
    adopt(initialProgress(Date.now()));
  }, [adopt, persist, push, setSync]);

  const value = useMemo<Account>(
    () => ({
      loaded,
      signedIn: stored !== null,
      emailHint: stored?.emailHint ?? null,
      phoneHint: stored?.phoneHint ?? null,
      sync,
      signUp: doSignUp,
      logIn: doLogIn,
      logOut,
      syncNow: pull,
    }),
    [loaded, stored, sync, doSignUp, doLogIn, logOut, pull],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): Account {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAccount fora do AccountProvider');
  return v;
}
