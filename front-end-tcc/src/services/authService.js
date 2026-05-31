import api from '../api/api';

const normalizeAuthResponse = (data) => {
  const accessToken = data?.accessToken ?? data?.access_token ?? data?.token ?? data?.jwt;

  if (!accessToken) {
    throw new Error('AUTH_TOKEN_NOT_FOUND');
  }

  return {
    token: accessToken,
    tokenType: data?.token_type ?? 'bearer',
    user: data?.user ?? null,
    raw: data,
  };
};

export const login = async (email, password) => {
  const body = new URLSearchParams();
  body.append('username', email);
  body.append('password', password);

  const response = await api.post('/auth/login', body.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return normalizeAuthResponse(response.data);
};

export const register = async (payload) => {
  const response = await api.post('/auth/register', payload);
  return response.data;
};

export const resetPassword = async ({ email, cpf, newPassword }) => {
  const response = await api.post('/auth/reset-password', {
    email,
    cpf,
    new_password: newPassword,
  });

  return response.data;
};

export const refreshToken = async () => null;

export const logout = async () => null;
