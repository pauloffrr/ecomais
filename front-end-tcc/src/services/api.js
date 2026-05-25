const API_BASE_URL = 'https://api.ecotech.app';

async function request(path, options = {}) {
  const token = options.token;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  return {
    ok: true,
    mocked: true,
    url: `${API_BASE_URL}${path}`,
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.parse(options.body) : undefined,
  };
}

export const api = {
  getProfile: () => request('/v1/users/me'),
  updateProfile: (payload, token) =>
    request('/v1/users/me', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  updatePreferences: (payload, token) =>
    request('/v1/users/me/preferences', {
      method: 'PUT',
      token,
      body: JSON.stringify(payload),
    }),
  sendSupportMessage: (payload, token) =>
    request('/v1/support/messages', {
      method: 'POST',
      token,
      body: JSON.stringify(payload),
    }),
  redeemReward: (rewardId, token) =>
    request(`/v1/rewards/${rewardId}/redeem`, {
      method: 'POST',
      token,
      body: JSON.stringify({ rewardId }),
    }),
};
