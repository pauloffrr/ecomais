import api from '../api/api';

export const getMaterials = async ({ skip = 0, limit = 1000, activeOnly = true } = {}) => {
  const response = await api.get('/materials', {
    params: {
      skip,
      limit,
      active_only: activeOnly,
    },
  });

  return response.data;
};
