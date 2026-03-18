import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('scopus_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const { user } = await authService.login(email, password);
      setUser(user);
      return user;
    } finally { setLoading(false); }
  };

  const register = async (data) => {
    setLoading(true);
    try {
      const { user } = await authService.register(data);
      setUser(user);
      return user;
    } finally { setLoading(false); }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const updateProfile = async (data) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    return updated;
  };

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated: !!user, loading,
      login, register, logout, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
