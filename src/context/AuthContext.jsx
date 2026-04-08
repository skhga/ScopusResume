import React, { createContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get current session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email, password) => {
    const { user } = await authService.login(email, password);
    return user;
  };

  const register = async (data) => {
    const { user } = await authService.register(data);
    return user;
  };

  const logout = async () => {
    await authService.logout();
  };

  const updateProfile = async (data) => {
    const updated = await authService.updateProfile(data);
    setUser(updated);
    return updated;
  };

  // Derive display name from Supabase user metadata
  const displayUser = user
    ? { ...user, name: user.user_metadata?.full_name || user.email }
    : null;

  return (
    <AuthContext.Provider value={{
      user: displayUser,
      isAuthenticated: !!user,
      loading,
      login,
      register,
      logout,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
