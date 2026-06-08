import api from '../api/api';

export const getUserById = async (userId) => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const updateUser = async (userId, payload) => {
  const response = await api.put(`/users/${userId}`, payload);
  return response.data;
};

export const changePassword = async (payload) => {
  const response = await api.put('/users/me/password', payload);
  return response.data;
};
