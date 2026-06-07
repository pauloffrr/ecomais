import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as storageService from '../services/storageService';

const extra =
  Constants.expoConfig?.extra ??
  Constants.manifest2?.extra?.expoClient?.extra ??
  {};

const normalizeBaseURL = (value) => value?.replace(/\/+$/, '');

const getHostFromExpo = () => {
  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.expoGoConfig?.debuggerHost ??
    Constants.manifest2?.extra?.expoClient?.hostUri;

  if (!hostUri) return null;

  return hostUri
    .replace(/^https?:\/\//, '')
    .split('/')[0]
    .split(':')[0];
};

const getDevelopmentHost = () => {
  if (Platform.OS === 'web') {
    const browserHost = globalThis.location?.hostname;
    return browserHost && browserHost !== '0.0.0.0' ? browserHost : 'localhost';
  }

  return getHostFromExpo() ?? (Platform.OS === 'android' ? '10.0.2.2' : 'localhost');
};

const platformApiBaseURL =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_API_BASE_URL_WEB ?? extra.apiBaseUrlWeb
    : process.env.EXPO_PUBLIC_API_BASE_URL_MOBILE ?? extra.apiBaseUrlMobile;

const apiBaseURL = normalizeBaseURL(
  platformApiBaseURL ??
    process.env.EXPO_PUBLIC_API_BASE_URL ??
    extra.apiBaseUrl ??
    `http://${getDevelopmentHost()}:${extra.apiPort ?? 8000}${extra.apiPath ?? '/v1'}`
);

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
