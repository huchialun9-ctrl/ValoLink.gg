'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Session {
  id: string;
  username: string;
  avatar: string;
  riotId: string | null;
  rank: string | null;
  valoScore: number;
}

interface AuthContextType {
  session: Session | null;
  loading: boolean;
  updateSession: (fields: Partial<Session>) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
  updateSession: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop()?.split(';').shift() || '');
      return null;
    };

    const cookie = getCookie('user_session');
    if (cookie) {
      try {
        setSession(JSON.parse(cookie));
      } catch {}
    }
    setLoading(false);
  }, []);

  const updateSession = (fields: Partial<Session>) => {
    setSession(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...fields };
      document.cookie = `user_session=${encodeURIComponent(JSON.stringify(updated))}; path=/; max-age=${60 * 60 * 24 * 7}; same-site=lax`;
      return updated;
    });
  };

  return (
    <AuthContext.Provider value={{ session, loading, updateSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
