import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import * as authService from '../services/authService';
import * as storageService from '../services/storageService';
import { getUserIdFromToken } from '../utils/jwt';

export const AuthContext = createContext(null);

const setAuthorizationHeader = (token) => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete api.defaults.headers.common.Authorization;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    setLoading(true);

    try {
      const storedToken = await storageService.getToken();
      const storedUser = await storageService.getUser();

      if (storedToken) {
        const restoredUserId = storedUser?.id ?? getUserIdFromToken(storedToken);

        setToken(storedToken);
        setUser(storedUser ?? (restoredUserId ? { id: restoredUserId } : null));
        setUserId(restoredUserId);
        setAuthorizationHeader(storedToken);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (email, password) => {
    const authData = await authService.login(email, password);
    const authenticatedUserId = authData.user?.id ?? getUserIdFromToken(authData.token);
    const authenticatedUser = authData.user ?? (authenticatedUserId ? { id: authenticatedUserId } : null);

    setToken(authData.token);
    setUser(authenticatedUser);
    setUserId(authenticatedUserId);
    setAuthorizationHeader(authData.token);

    await storageService.setToken(authData.token);

    if (authenticatedUser) {
      await storageService.setUser(authenticatedUser);
    } else {
      await storageService.removeUser();
    }

    return authData;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    await storageService.clearAuthStorage();
    setToken(null);
    setUser(null);
    setUserId(null);
    setAuthorizationHeader(null);
  }, []);

  const updateUser = useCallback(async (nextUser) => {
    setUser(nextUser);
    setUserId(nextUser?.id ?? null);

    if (nextUser) {
      await storageService.setUser(nextUser);
    } else {
      await storageService.removeUser();
    }
  }, []);

  const value = useMemo(
    () => ({
      authenticated: Boolean(token),
      user,
      userId,
      token,
      loading,
      login,
      logout,
      restoreSession,
      updateUser,
    }),
    [loading, login, logout, restoreSession, token, updateUser, user, userId]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
