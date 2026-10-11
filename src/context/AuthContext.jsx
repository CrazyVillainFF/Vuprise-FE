import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { connectRealtime, disconnectRealtime } from '../services/realtime';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('nexora_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('nexora_token'));
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState('');

  const clearWelcomeMessage = useCallback(() => setWelcomeMessage(''), []);

  const logout = useCallback(() => {
    disconnectRealtime({ notify: true });
    localStorage.removeItem('nexora_token');
    localStorage.removeItem('nexora_user');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return undefined;
    connectRealtime(token);
    return () => disconnectRealtime();
  }, [token]);

  // Fetch current user details on boot if token exists
  const checkAuth = useCallback(async () => {
    const savedToken = localStorage.getItem('nexora_token');
    if (!savedToken) {
      setLoading(false);
      return;
    }

    try {
      const res = await authAPI.getMe();
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
        localStorage.setItem('nexora_user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.warn('[AuthCheck] Session verification failed:', err.message);
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    checkAuth();

    // Listen for unauthorized events emitted by API interceptor
    const handleUnauthorized = () => logout();
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [checkAuth, logout]);

  // Login handler
  const login = async (email, password) => {
    setAuthError(null);
    try {
      const res = await authAPI.login({ email, password });
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('nexora_token', receivedToken);
      localStorage.setItem('nexora_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setWelcomeMessage('Welcome back To Vuprise');
      return { success: true, user: receivedUser };
    } catch (err) {
      const msg = err.message || 'Login failed. Please check your credentials.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Register handler
  const register = async (userData) => {
    setAuthError(null);
    try {
      const res = await authAPI.register(userData);
      const { token: receivedToken, user: receivedUser } = res.data;

      localStorage.setItem('nexora_token', receivedToken);
      localStorage.setItem('nexora_user', JSON.stringify(receivedUser));

      setToken(receivedToken);
      setUser(receivedUser);
      setWelcomeMessage('Welcome to Vuprise');
      return { success: true, user: receivedUser };
    } catch (err) {
      const msg = err.message || 'Registration failed. Please try again.';
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  // Update local user state
  const updateUser = (updatedUser) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedUser };
      localStorage.setItem('nexora_user', JSON.stringify(merged));
      return merged;
    });
  };

  const value = {
    user,
    token,
    loading,
    authError,
    welcomeMessage,
    clearWelcomeMessage,
    isAuthenticated: !!token && !!user,
    login,
    register,
    logout,
    updateUser,
    refreshUser: checkAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
