import api from '../api/api';

export const sendSupportMessage = async (payload) => {
  const response = await api.post('/support/messages', payload);
  return response.data;
};
