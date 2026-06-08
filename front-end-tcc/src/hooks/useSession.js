import { useCallback, useState } from 'react';
import { isCanceledRequest } from '../api/api';
import * as sessionService from '../services/sessionService';
import { useAuth } from './useAuth';

const getSessionErrorMessage = (error) => {
  const detail = String(error?.response?.data?.detail ?? '').toLowerCase();

  if (error?.response?.status === 404) {
    return 'Maquina nao encontrada.';
  }

  if (error?.response?.status === 409 && detail.includes('active session')) {
    return 'Voce ja possui uma sessao ativa.';
  }

  if (error?.response?.status === 409) {
    return 'Esta estacao esta indisponivel no momento.';
  }

  if (error?.response?.status === 422) {
    return 'QR invalido.';
  }

  if (error?.response?.status >= 500 || !error?.response) {
    return 'Falha ao conectar com a estacao.';
  }

  return 'Falha ao conectar com a estacao.';
};

export const useSession = () => {
  const { logout } = useAuth();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const startSession = useCallback(
    async (machineQr) => {
      const code = machineQr?.trim();

      if (!code) {
        const invalidError = new Error('QR_INVALID');
        setError(invalidError);
        throw invalidError;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await sessionService.startSession(code);
        setSession(data);
        return data;
      } catch (requestError) {
        if (isCanceledRequest(requestError)) return null;

        if (requestError?.isSessionExpired || requestError?.response?.status === 401) {
          await logout();
        }

        setError(requestError);
        throw requestError;
      } finally {
        setLoading(false);
      }
    },
    [logout]
  );

  const resetSession = useCallback(() => {
    setSession(null);
    setError(null);
  }, []);

  return {
    session,
    loading,
    error,
    errorMessage: error?.message === 'QR_INVALID' ? 'QR invalido.' : error ? getSessionErrorMessage(error) : '',
    startSession,
    resetSession,
  };
};
