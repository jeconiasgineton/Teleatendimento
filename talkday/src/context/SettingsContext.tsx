import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Accent } from '@/domain/types';
import { syncReminder } from '@/services/reminders';
import { KEYS, loadJSON, saveJSON } from '@/services/storage';

interface Persisted {
  accent: Accent;
  rate: number;
  reminder: boolean;
}

const DEFAULTS: Persisted = { accent: 'en-US', rate: 0.9, reminder: false };

function isPersisted(x: unknown): x is Persisted {
  if (typeof x !== 'object' || x === null) return false;
  const s = x as Partial<Persisted>;
  return (s.accent === 'en-US' || s.accent === 'en-GB') && typeof s.rate === 'number' && typeof s.reminder === 'boolean';
}

interface Settings extends Persisted {
  loaded: boolean;
  setAccent: (a: Accent) => void;
  setRate: (r: number) => void;
  /** Liga/desliga o lembrete diário; devolve false se faltou permissão. */
  setReminder: (on: boolean) => Promise<boolean>;
}

const Ctx = createContext<Settings | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Persisted>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    loadJSON(KEYS.settings, isPersisted).then((saved) => {
      if (!alive) return;
      if (saved) setData(saved);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (loaded) saveJSON(KEYS.settings, data);
  }, [data, loaded]);

  const setAccent = useCallback((accent: Accent) => setData((d) => ({ ...d, accent })), []);
  const setRate = useCallback((rate: number) => setData((d) => ({ ...d, rate })), []);
  const setReminder = useCallback(async (on: boolean) => {
    const ok = await syncReminder(on);
    setData((d) => ({ ...d, reminder: on && ok }));
    return !on || ok;
  }, []);

  const value = useMemo(() => ({ ...data, loaded, setAccent, setRate, setReminder }), [data, loaded, setAccent, setRate, setReminder]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Settings {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings fora do SettingsProvider');
  return v;
}
