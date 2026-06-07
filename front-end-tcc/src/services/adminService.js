import api from '../api/api';

const normalizeListResponse = (data) => ({
  items: Array.isArray(data?.items) ? data.items : [],
  total: Number(data?.total ?? data?.items?.length ?? 0),
});

export const getBins = async ({ skip = 0, limit = 100 } = {}) => {
  const response = await api.get('/admin/bins', {
    params: { skip, limit },
  });

  return normalizeListResponse(response.data);
};

export const getFlaggedDiscards = async ({ skip = 0, limit = 100 } = {}) => {
  const response = await api.get('/admin/discards/flagged', {
    params: { skip, limit },
  });

  return normalizeListResponse(response.data);
};

export const resolveDiscard = async (discardId, { status, admin_note: adminNote }) => {
  const response = await api.post(`/admin/discards/${discardId}/resolve`, {
    approve: status === 'approved',
    reason: adminNote.trim(),
  });

  return response.data;
};

export const getAdminErrorMessage = (error, fallback = 'Nao foi possivel carregar os dados administrativos.') => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail;

  if (!error?.response) return 'Falha na conexao com o servidor.';
  if (status === 401) return 'Sua sessao expirou. Entre novamente.';
  if (status === 403) return 'Acesso restrito a administradores.';
  if (status === 404) return detail || 'Registro nao encontrado.';
  if (status >= 500) return 'Erro interno do servidor.';

  return typeof detail === 'string' ? detail : fallback;
};
