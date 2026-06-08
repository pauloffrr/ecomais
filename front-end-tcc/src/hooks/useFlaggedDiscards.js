import { useCallback, useEffect, useState } from 'react';
import { isCanceledRequest } from '../api/api';
import * as adminService from '../services/adminService';
import { useAuth } from './useAuth';

const shouldRetry = (error) => !error?.response && !isCanceledRequest(error);

export const useFlaggedDiscards = ({ enabled = true } = {}) => {
  const { logout, token } = useAuth();
  const [discards, setDiscards] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(token && enabled));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);

  const loadDiscards = useCallback(
    async ({ refresh = false, retry = true } = {}) => {
      if (!token || !enabled) {
        setLoading(false);
        return [];
      }

      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await adminService.getFlaggedDiscards();
        setDiscards(data.items);
        setTotal(data.total);
        setError(null);
        return data.items;
      } catch (requestError) {
        if (isCanceledRequest(requestError)) return [];

        if (requestError?.isSessionExpired || requestError?.response?.status === 401) {
          await logout();
          return [];
        }

        if (retry && shouldRetry(requestError)) {
          return loadDiscards({ refresh, retry: false });
        }

        setError(requestError);
        return [];
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [enabled, logout, token]
  );

  useEffect(() => {
    loadDiscards();
  }, [loadDiscards]);

  const resolveDiscard = useCallback(
    async (discardId, resolution) => {
      setResolvingId(discardId);

      try {
        const resolvedDiscard = await adminService.resolveDiscard(discardId, resolution);
        setDiscards((current) => current.filter((item) => item.id !== discardId));
        setTotal((current) => Math.max(0, current - 1));
        return resolvedDiscard;
      } finally {
        setResolvingId(null);
      }
    },
    []
  );

  return {
    discards,
    total,
    loading,
    refreshing,
    error,
    resolvingId,
    refetch: loadDiscards,
    resolveDiscard,
  };
};
