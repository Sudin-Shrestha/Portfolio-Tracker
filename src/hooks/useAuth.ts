import { useCallback, useEffect, useState } from 'react';
import {
  AuthToken,
  clearToken,
  createToken,
  loadToken,
  millisecondsUntilExpiry,
  saveToken,
  verifyCredentials,
} from '../utils/auth';

export interface UseAuthResult {
  token: AuthToken | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => { ok: true } | { ok: false; error: string };
  logout: () => void;
}

export const useAuth = (): UseAuthResult => {
  const [token, setToken] = useState<AuthToken | null>(() => loadToken());

  useEffect(() => {
    if (!token) return;
    const remaining = millisecondsUntilExpiry(token);
    if (remaining <= 0) {
      clearToken();
      setToken(null);
      return;
    }
    const timer = window.setTimeout(() => {
      clearToken();
      setToken(null);
    }, remaining);
    return () => window.clearTimeout(timer);
  }, [token]);

  const login = useCallback((email: string, password: string) => {
    if (!verifyCredentials(email, password)) {
      return { ok: false as const, error: 'Invalid email or password.' };
    }
    const fresh = createToken(email.trim().toLowerCase());
    saveToken(fresh);
    setToken(fresh);
    return { ok: true as const };
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
  }, []);

  return {
    token,
    isAuthenticated: token !== null,
    login,
    logout,
  };
};
