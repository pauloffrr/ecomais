import { useCallback, useEffect, useState } from 'react';
import { isCanceledRequest } from '../api/api';
import * as userService from '../services/userService';
import { useAuth } from './useAuth';

const shouldRetry = (error) => !error?.response && !isCanceledRequest(error);

export const useUser = () => {
  const { logout, updateUser, user, userId } = useAuth();
  const [loading, setLoading] = useState(Boolean(userId && !user));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadUser = useCallback(
    async ({ refresh = false, retry = true, silent = false } = {}) => {
      if (!userId) {
        setError(new Error('USER_ID_NOT_FOUND'));
        setLoading(false);
        return null;
      }

      if (refresh) setRefreshing(true);
      else if (!silent) setLoading(true);

      try {
        const data = await userService.getUserById(userId);
        setError(null);
        await updateUser(data);
        return data;
      } catch (requestError) {
        if (isCanceledRequest(requestError)) return null;

        if (requestError?.isSessionExpired || requestError?.response?.status === 401) {
          await logout();
          return null;
        }

        if (retry && shouldRetry(requestError)) {
          return loadUser({ refresh, retry: false, silent });
        }

        setError(requestError);
        return null;
      } finally {
        if (!silent) setLoading(false);
        if (refresh) setRefreshing(false);
      }
    },
    [logout, updateUser, userId]
  );

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return {
    user,
    loading,
    refreshing,
    error,
    refetch: loadUser,
  };
};
