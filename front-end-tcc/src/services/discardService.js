import api from '../api/api';

export const getDiscardHistory = async ({ skip = 0, limit = 1000 } = {}) => {
  const response = await api.get('/discards/history', {
    params: { skip, limit },
  });

  return response.data;
};
