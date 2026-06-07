import { useCallback, useEffect, useState } from 'react';
import * as adminService from '../services/adminService';
import { useAuth } from './useAuth';

const shouldRetry = (error) => !error?.response;

export const useAdminBins = ({ enabled = true } = {}) => {
  const { logout, token } = useAuth();
  const [bins, setBins] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(token && enabled));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadBins = useCallback(
    async ({ refresh = false, retry = true } = {}) => {
      if (!token || !enabled) {
        setLoading(false);
        return [];
      }

      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await adminService.getBins();
        setBins(data.items);
        setTotal(data.total);
        setError(null);
        return data.items;
      } catch (requestError) {
        if (requestError?.isSessionExpired || requestError?.response?.status === 401) {
          await logout();
          return [];
        }

        if (retry && shouldRetry(requestError)) {
          return loadBins({ refresh, retry: false });
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
    loadBins();
  }, [loadBins]);

  return {
    bins,
    total,
    loading,
    refreshing,
    error,
    refetch: loadBins,
  };
};
