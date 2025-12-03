import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from 'react';
import { getCurrentUser, logout as apiLogout, UserResponse } from '../api/authentication';

type PersistTarget = 'local' | 'session';

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, options?: { persist?: PersistTarget }) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const TOKEN_KEY = 'deepfake_token';
const LEGACY_TOKEN_KEY = 'auth_token';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getStoredToken = (): string | null => {
  return (
    localStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(LEGACY_TOKEN_KEY) ||
    sessionStorage.getItem(TOKEN_KEY)
  );
};

const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // DEV: support skipping login for local development
  // Enable by setting VITE_SKIP_LOGIN=true in UI/.env
  useEffect(() => {
    const skip = import.meta.env.VITE_SKIP_LOGIN === 'true' || import.meta.env.VITE_SKIP_LOGIN === true;
    if (skip) {
      // Put a mock token and user into storage so rest of app treats user as authenticated
      const mockToken = import.meta.env.VITE_SKIP_LOGIN_TOKEN ?? 'dev-skip-token';
      try {
        localStorage.setItem(TOKEN_KEY, mockToken);
      } catch (e) {
        // ignore storage errors in some test environments
      }
      // set a lightweight mock user
      setUser({ id: 'dev-user', email: 'dev@local', full_name: 'Dev User', is_active: true, is_superuser: false });
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData);
    } catch (error) {
      clearStoredToken();
      setUser(null);
      throw error;
    }
  }, []);

  useEffect(() => {
    const token = getStoredToken();

    if (!token) {
      setIsLoading(false);
      return;
    }

    refreshUser()
      .catch(() => {
        // handled inside refreshUser, nothing else required
      })
      .finally(() => setIsLoading(false));
  }, [refreshUser]);

  const login = useCallback(
    (token: string, options?: { persist?: PersistTarget }) => {
      const persistTarget = options?.persist ?? 'local';

      if (persistTarget === 'local') {
        localStorage.setItem(TOKEN_KEY, token);
        sessionStorage.removeItem(TOKEN_KEY);
      } else {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.removeItem(TOKEN_KEY);
      }

      refreshUser().catch(() => {
        // refresh errors handled internally
      });
    },
    [refreshUser],
  );

  const logout = useCallback(() => {
    apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      logout,
      refreshUser,
    }),
    [isLoading, login, logout, refreshUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

