import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { can, shouldRenew, type Feature, type Plan } from '@/domain/plan';
import { onTokenInvalid, onUsage, setAuth } from '@/services/auth';
import { clearStored, loadDeviceId, loadStored, redeemCode, saveStored, type RedeemResult, type Stored } from '@/services/entitlement';

interface Entitlement {
  plan: Plan;
  loaded: boolean;
  /** Quando o plano pago vence (ms). */
  expiresAt: number | null;
  /** Correções usadas hoje no plano grátis (última informação do servidor). */
  usage: { used: number; limit: number } | null;
  /** Ativa um código; o plano muda se o servidor aceitar. */
  redeem: (code: string) => Promise<RedeemResult>;
  /** Volta para o plano grátis neste aparelho. */
  signOut: () => Promise<void>;
  can: (feature: Feature) => boolean;
}

const Ctx = createContext<Entitlement | null>(null);

export function EntitlementProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [usage, setUsage] = useState<Entitlement['usage']>(null);
  const renewing = useRef(false);

  const apply = useCallback((s: Stored | null) => {
    setStored(s);
    setAuth({ token: s?.token ?? null });
  }, []);

  /** Renova o token com o código guardado; se o servidor recusar, volta ao grátis. */
  const renew = useCallback(
    async (current: Stored) => {
      if (renewing.current) return;
      renewing.current = true;
      try {
        const r = await redeemCode(current.code);
        if (r.ok) {
          await saveStored(r.stored);
          apply(r.stored);
        } else if (r.reason === 'invalid') {
          await clearStored();
          apply(null);
        } else if (current.expiresAt <= Date.now()) {
          apply(null); // sem internet e token vencido: grátis até conseguir renovar
        }
      } finally {
        renewing.current = false;
      }
    },
    [apply],
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      setAuth({ deviceId: await loadDeviceId() });
      const saved = await loadStored();
      if (!alive) return;
      if (saved && saved.expiresAt > Date.now()) apply(saved);
      if (saved && shouldRenew(saved.expiresAt, Date.now())) await renew(saved);
      if (alive) setLoaded(true);
    })();
    return () => {
      alive = false;
    };
  }, [apply, renew]);

  // O servidor disse que o token não vale mais: tenta renovar uma vez; senão, grátis.
  const storedRef = useRef(stored);
  storedRef.current = stored;
  useEffect(
    () =>
      onTokenInvalid(() => {
        const s = storedRef.current;
        if (s) renew({ ...s, expiresAt: 0 });
        else setAuth({ token: null });
      }),
    [renew],
  );
  useEffect(() => onUsage(setUsage), []);

  // Ao voltar para o app, renova o token se estiver perto de vencer.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const cur = storedRef.current;
      if (s === 'active' && cur && shouldRenew(cur.expiresAt, Date.now())) renew(cur);
    });
    return () => sub.remove();
  }, [renew]);

  const redeem = useCallback(
    async (code: string) => {
      const r = await redeemCode(code);
      if (r.ok) {
        await saveStored(r.stored);
        apply(r.stored);
        setUsage(null);
      }
      return r;
    },
    [apply],
  );

  const signOut = useCallback(async () => {
    await clearStored();
    apply(null);
  }, [apply]);

  const plan: Plan = stored && stored.expiresAt > Date.now() ? stored.plan : 'free';
  const value = useMemo<Entitlement>(
    () => ({ plan, loaded, expiresAt: stored?.expiresAt ?? null, usage, redeem, signOut, can: (f: Feature) => can(plan, f) }),
    [plan, loaded, stored, usage, redeem, signOut],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useEntitlement(): Entitlement {
  const v = useContext(Ctx);
  if (!v) throw new Error('useEntitlement fora do EntitlementProvider');
  return v;
}
