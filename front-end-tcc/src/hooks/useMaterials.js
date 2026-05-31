import { useCallback, useEffect, useState } from 'react';
import * as materialService from '../services/materialService';
import { useAuth } from './useAuth';

const shouldRetry = (error) => !error?.response;

export const useMaterials = () => {
  const { logout, token } = useAuth();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(Boolean(token));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadMaterials = useCallback(
    async ({ refresh = false, retry = true } = {}) => {
      if (!token) {
        setLoading(false);
        return [];
      }

      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await materialService.getMaterials();
        const items = data?.materials ?? [];
        setMaterials(items);
        setError(null);
        return items;
      } catch (requestError) {
        if (requestError?.isSessionExpired || requestError?.response?.status === 401) {
          await logout();
          return [];
        }

        if (retry && shouldRetry(requestError)) {
          return loadMaterials({ refresh, retry: false });
        }

        setError(requestError);
        return [];
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, token]
  );

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  return {
    materials,
    loading,
    refreshing,
    error,
    refetch: loadMaterials,
  };
};
