import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AuthContext,
  type AuthState,
  type CredentialUser,
  clearSession,
  findCredential,
  getStoredSession,
  saveSession,
} from "./useAuth";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CredentialUser | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setUser(stored);
    }
    setIsInitializing(false);
  }, []);

  const login = useCallback((username: string, password: string): boolean => {
    setIsLoggingIn(true);
    setLoginError(null);
    const found = findCredential(username, password);
    if (found) {
      saveSession(found);
      setUser(found);
      setIsLoggingIn(false);
      return true;
    }
    setLoginError("Invalid username or password.");
    setIsLoggingIn(false);
    return false;
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setUser(null);
    setLoginError(null);
  }, []);

  const value = useMemo<AuthState>(
    () => ({ user, isInitializing, isLoggingIn, loginError, login, logout }),
    [user, isInitializing, isLoggingIn, loginError, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
