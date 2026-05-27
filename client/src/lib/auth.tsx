import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GuestIdentity, localDb } from './localDb';

interface AuthContextValue {
  identity: GuestIdentity | null;
  isBooting: boolean;
  joinAsGuest: (username: string) => Promise<void>;
  renameGuest: (username: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [identity, setIdentity] = useState<GuestIdentity | null>(null);
  const [isBooting, setIsBooting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreIdentity() {
      try {
        const activeId = await localDb.getActiveIdentityId();
        const restored = activeId ? await localDb.getIdentity(activeId) : null;
        const touched = restored ? await localDb.touchIdentity(restored) : null;
        if (!cancelled) setIdentity(touched);
      } finally {
        if (!cancelled) setIsBooting(false);
      }
    }

    void restoreIdentity();
    return () => {
      cancelled = true;
    };
  }, []);

  const joinAsGuest = useCallback(async (username: string) => {
    const next = await localDb.createGuestIdentity(username);
    setIdentity(next);
  }, []);

  const renameGuest = useCallback(async (username: string) => {
    if (!identity) return;
    const next = await localDb.touchIdentity({ ...identity, username: username.trim() });
    setIdentity(next);
  }, [identity]);

  const value = useMemo<AuthContextValue>(() => ({
    identity,
    isBooting,
    joinAsGuest,
    renameGuest,
  }), [identity, isBooting, joinAsGuest, renameGuest]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }
  return context;
}
