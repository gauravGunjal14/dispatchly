'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';
import { getSocket } from '@/lib/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize from storage & verify me
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('dispatchly_access_token');
      if (storedToken) {
        setToken(storedToken);
        try {
          const res = await apiClient('/auth/me');
          if (res.success && res.data?.user) {
            setUser(res.data.user);
            const socket = getSocket();
            if (socket) {
              socket.emit('join:user', res.data.user.id);
              if (res.data.user.role === 'admin') {
                socket.emit('join:admin');
              }
            }
          }
        } catch {
          // Token invalid or expired
          logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.success && res.data) {
      const { user: userData, tokens } = res.data;
      localStorage.setItem('dispatchly_access_token', tokens.accessToken);
      localStorage.setItem('dispatchly_refresh_token', tokens.refreshToken);
      setUser(userData);
      setToken(tokens.accessToken);

      const socket = getSocket();
      if (socket) {
        socket.emit('join:user', userData.id);
        if (userData.role === 'admin') {
          socket.emit('join:admin');
        }
      }

      return userData;
    }
    throw new Error(res.message || 'Login failed');
  };

  const register = async (payload) => {
    const res = await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.success && res.data) {
      const { user: userData, tokens } = res.data;
      localStorage.setItem('dispatchly_access_token', tokens.accessToken);
      localStorage.setItem('dispatchly_refresh_token', tokens.refreshToken);
      setUser(userData);
      setToken(tokens.accessToken);

      const socket = getSocket();
      if (socket) {
        socket.emit('join:user', userData.id);
      }

      return userData;
    }
    throw new Error(res.message || 'Registration failed');
  };

  const logout = async () => {
    try {
      if (token) {
        await apiClient('/auth/logout', { method: 'POST' }).catch(() => {});
      }
    } finally {
      localStorage.removeItem('dispatchly_access_token');
      localStorage.removeItem('dispatchly_refresh_token');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!user,
        role: user?.role || null,
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
