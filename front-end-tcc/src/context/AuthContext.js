import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import * as authService from '../api/authService';
import * as storageService from '../services/storageService';

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
  const [loading, setLoading] = useState(true);

  const restoreSession = useCallback(async () => {
    setLoading(true);

    try {
      const storedToken = await storageService.getToken();
      const storedUser = await storageService.getUser();

      if (storedToken) {
        setToken(storedToken);
        setUser(storedUser);
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

    setToken(authData.token);
    setUser(authData.user);
    setAuthorizationHeader(authData.token);

    await storageService.setToken(authData.token);

    if (authData.user) {
      await storageService.setUser(authData.user);
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
    setAuthorizationHeader(null);
  }, []);

  const value = useMemo(
    () => ({
      authenticated: Boolean(token),
      user,
      token,
      loading,
      login,
      logout,
      restoreSession,
    }),
    [loading, login, logout, restoreSession, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
