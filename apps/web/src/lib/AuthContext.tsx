'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Session {
  id: string;
  username: string;
  avatar: string;
  riotId: string | null;
  rank: string | null;
  valoScore: number;
  email?: string;
  bio?: string;
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

    const userSession = getCookie('user_session');
    if (userSession) {
      try {
        setSession(JSON.parse(userSession));
        setLoading(false);
        return;
      } catch {}
    }

    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          setSession({
            id: data.user.id,
            username: data.user.displayName || data.user.email?.split('@')[0] || 'User',
            avatar: data.user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.user.displayName || 'U')}&background=7aa2f7&color=fff&size=64`,
            riotId: data.user.riotId || null,
            rank: data.user.rank || null,
            valoScore: data.user.valoScore || 100,
            email: data.user.email,
            bio: data.user.bio,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
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
