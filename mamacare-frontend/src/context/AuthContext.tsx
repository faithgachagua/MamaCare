import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role, Stage, TokenResponse } from '../services/api';

export interface AuthUser {
  userId: string;
  fullName: string;
  email: string;
  role: Role;
  stage?: Stage;
  pregnancyId?: string;
  gestationalAgeWeeks?: number;
  weeksPostpartum?: number;
  dueDate?: string;
  deliveryDate?: string;
}

export function userFromToken(d: TokenResponse): AuthUser {
  return {
    userId: d.user_id,
    fullName: d.full_name,
    email: d.email,
    role: d.role,
    stage: d.stage,
    pregnancyId: d.pregnancy_id,
    gestationalAgeWeeks: d.gestational_age_weeks,
    weeksPostpartum: d.weeks_postpartum,
    dueDate: d.due_date,
    deliveryDate: d.delivery_date,
  };
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem('mc-user');
      // Sessions saved before roles existed had no role: they were all mothers.
      return raw ? ({ role: 'mother', ...JSON.parse(raw) } as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState<string | null>(() => localStorage.getItem('mc-token'));

  function login(newUser: AuthUser, newToken: string) {
    setUser(newUser);
    setToken(newToken);
    localStorage.setItem('mc-user', JSON.stringify(newUser));
    localStorage.setItem('mc-token', newToken);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('mc-user');
    localStorage.removeItem('mc-token');
    localStorage.removeItem('mamacare-active-session');
  }

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
