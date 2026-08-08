'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';
import { User, LoginRequest, SignupRequest, ApiError } from '../lib/api/types';
import { authService } from '../lib/api/services';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  developerLogin: (credentials: LoginRequest) => Promise<User>;
  signup: (userData: SignupRequest) => Promise<void>;
  logout: () => Promise<void>;
  error: string | null;
  clearError: () => void;
  isDeveloper: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeveloper, setIsDeveloper] = useState(false);
  const router = useRouter();

  const isAuthenticated = !!user;
  const clearError = useCallback(() => setError(null), []);

  const login = async (credentials: LoginRequest): Promise<User> => {
    try {
      setIsLoading(true);
      clearError();

      const response = await authService.login(credentials);
      Cookies.set('auth_token', response.token, { expires: 7, sameSite: 'strict' });
      setUser(response.user);
      setIsDeveloper(false);
      return response.user;
    } catch (err: any) {
      const message = err?.message || 'Invalid email or password';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const developerLogin = async (credentials: LoginRequest): Promise<User> => {
    try {
      setIsLoading(true);
      clearError();

      const response = await authService.developerLogin(credentials);
      Cookies.set('auth_token', response.token, { expires: 7, sameSite: 'strict' });
      setUser(response.user);
      setIsDeveloper(true);
      return response.user;
    } catch (err: any) {
      const message = err?.message || 'Invalid developer credentials';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (_userData: SignupRequest): Promise<void> => {
    throw { message: 'Signup not available', status: 403 } as ApiError;
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch {
      // ignore logout errors
    } finally {
      Cookies.remove('auth_token');
      setUser(null);
      setIsDeveloper(false);
      window.location.href = '/login';
    }
  };

  // Restore session from cookie on mount
  useEffect(() => {
    const token = Cookies.get('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    authService.getCurrentUser()
      .then((currentUser) => {
        setUser(currentUser);
        setIsDeveloper(!!currentUser.isDeveloper);
      })
      .catch(() => {
        Cookies.remove('auth_token');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, isLoading, login, developerLogin, signup, logout, error, clearError, isDeveloper }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
