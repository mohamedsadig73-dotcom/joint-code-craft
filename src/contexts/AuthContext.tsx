import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
  role: 'admin' | 'manager' | 'user';
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS = [
  { username: 'ali', password: 'demo123', role: 'admin' as const, email: 'ali@okcomputer.com' },
  { username: 'sara', password: 'demo123', role: 'manager' as const, email: 'sara@okcomputer.com' },
  { username: 'ahmed', password: 'demo123', role: 'user' as const, email: 'ahmed@okcomputer.com' },
];

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('dts_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const login = (username: string, password: string): boolean => {
    const foundUser = DEMO_USERS.find(u => u.username === username && u.password === password);
    if (foundUser) {
      const userData: User = {
        username: foundUser.username,
        role: foundUser.role,
        email: foundUser.email,
      };
      setUser(userData);
      localStorage.setItem('dts_user', JSON.stringify(userData));
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('dts_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
