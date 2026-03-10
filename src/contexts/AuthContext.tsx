import React, { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { User } from '@/data/models';
import { authService } from '@/services/authService';
import { getAuthToken, getAuthUser } from '@/services/authStorage';

interface AuthContextType {
  user: User | null;
  token: string;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: { name: string; email: string; password: string; avatar: string }) => Promise<string>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(() => getAuthUser());
  const [token, setToken] = useState<string>(() => getAuthToken());

  const login = async (email: string, password: string) => {
    const loggedInUser = await authService.login({ email, password });
    setUser(loggedInUser);
    setToken(getAuthToken());
  };


  const signup = async (payload: { name: string; email: string; password: string; avatar: string }) => {
    return authService.signup(payload);
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    setToken('');
  };

  const value = useMemo(() => ({
    user,
    token,
    isAuthenticated: Boolean(user && token),
    login,
    signup,
    logout,
  }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
