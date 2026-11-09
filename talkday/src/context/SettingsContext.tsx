import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Accent } from '@/domain/types';

interface Settings {
  accent: Accent;
  setAccent: (a: Accent) => void;
  rate: number;
  setRate: (r: number) => void;
}

const Ctx = createContext<Settings | null>(null);

/** Em memória por enquanto; a persistência local entra na Fase 4. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<Accent>('en-US');
  const [rate, setRate] = useState(0.9);
  const value = useMemo(() => ({ accent, setAccent, rate, setRate }), [accent, rate]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings(): Settings {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSettings fora do SettingsProvider');
  return v;
}
