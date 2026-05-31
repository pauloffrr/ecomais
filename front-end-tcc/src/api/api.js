import axios from 'axios';
import Constants from 'expo-constants';
import * as storageService from '../services/storageService';

const apiBaseURL =
  Constants.expoConfig?.extra?.apiBaseUrl ??
  Constants.manifest2?.extra?.expoClient?.extra?.apiBaseUrl ??
  'http://localhost:8000/v1';

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await storageService.getToken();

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      error.isSessionExpired = true;
      await storageService.clearAuthStorage();
    }

    return Promise.reject(error);
  }
);

export default api;
