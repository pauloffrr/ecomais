import { useCallback, useEffect, useState } from 'react';
import { isCanceledRequest } from '../api/api';
import * as discardService from '../services/discardService';
import { useAuth } from './useAuth';

const shouldRetry = (error) => !error?.response && !isCanceledRequest(error);

export const useDiscards = ({ pageSize = 1000 } = {}) => {
  const { logout, token } = useAuth();
  const [discards, setDiscards] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(Boolean(token));
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadDiscards = useCallback(
    async ({ refresh = false, retry = true } = {}) => {
      if (!token) {
        setLoading(false);
        return [];
      }

      if (refresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await discardService.getDiscardHistory({ skip: 0, limit: pageSize });
        const items = data?.items ?? [];
        setDiscards(items);
        setTotal(data?.total ?? items.length);
        setError(null);
        return items;
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
    [logout, pageSize, token]
  );

  const loadMore = useCallback(async () => {
    if (!token || paginationLoading || discards.length >= total) {
      return [];
    }

    setPaginationLoading(true);

    try {
      const data = await discardService.getDiscardHistory({
        skip: discards.length,
        limit: pageSize,
      });
      const items = data?.items ?? [];

      setDiscards((current) => [...current, ...items]);
      setTotal(data?.total ?? discards.length + items.length);
      setError(null);
      return items;
    } catch (requestError) {
      if (isCanceledRequest(requestError)) return [];

      if (requestError?.isSessionExpired || requestError?.response?.status === 401) {
        await logout();
        return [];
      }

      setError(requestError);
      return [];
    } finally {
      setPaginationLoading(false);
    }
  }, [discards.length, logout, pageSize, paginationLoading, token, total]);

  useEffect(() => {
    loadDiscards();
  }, [loadDiscards]);

  return {
    discards,
    total,
    loading,
    paginationLoading,
    refreshing,
    error,
    hasMore: discards.length < total,
    loadMore,
    refetch: loadDiscards,
  };
};
