import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '../types';
import { api, setCurrentApiRole } from '../lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAdmin: boolean;
  canEdit: boolean;
  canDelete: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  switchRoleQuick: (role: UserRole) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'diamond_dairy_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setCurrentApiRole(parsed.role);
        return parsed;
      }
    } catch {
      // ignore
    }
    // Default logged in as Admin for instant usability, or user can switch/log out
    const defaultUser: User = {
      id: 'usr-admin',
      username: 'admin',
      role: 'Admin',
      name: 'Muhammad Imran (Admin)',
    };
    setCurrentApiRole('Admin');
    return defaultUser;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      setCurrentApiRole(user.role);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setCurrentApiRole('Admin');
    }
  }, [user]);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const res = await api.login({ username, password });
      if (res.success && res.user) {
        setUser(res.user);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login error:', err);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const switchRoleQuick = async (newRole: UserRole) => {
    if (newRole === 'Admin') {
      const u: User = {
        id: 'usr-admin',
        username: 'admin',
        role: 'Admin',
        name: 'Muhammad Imran (Admin)',
      };
      setUser(u);
    } else {
      const u: User = {
        id: 'usr-accountant',
        username: 'accountant',
        role: 'Accountant',
        name: 'Accountant Staff',
      };
      setUser(u);
    }
  };

  const isAdmin = user?.role === 'Admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        isAdmin,
        canEdit: isAdmin,
        canDelete: isAdmin,
        login,
        logout,
        switchRoleQuick,
        switchRole: switchRoleQuick,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
