import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as storageService from '../services/storageService';

const pendingRequestControllers = new Set();
let requestGeneration = 0;

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

export const API_BASE_URL = apiBaseURL;

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

export const cancelPendingRequests = () => {
  requestGeneration += 1;

  pendingRequestControllers.forEach((controller) => controller.abort());
  pendingRequestControllers.clear();
};

export const isCanceledRequest = (error) =>
  axios.isCancel(error) || error?.code === 'ERR_CANCELED';

api.interceptors.request.use(async (config) => {
  const generation = requestGeneration;
  const controller = new AbortController();

  config.signal = controller.signal;
  config.pendingRequestController = controller;
  pendingRequestControllers.add(controller);

  const token = await storageService.getToken();

  if (generation !== requestGeneration) {
    controller.abort();
    throw new axios.CanceledError('Request canceled because the session ended.');
  }

  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    pendingRequestControllers.delete(response.config?.pendingRequestController);
    return response;
  },
  async (error) => {
    pendingRequestControllers.delete(error?.config?.pendingRequestController);

    if (error?.response?.status === 401) {
      error.isSessionExpired = true;
      await storageService.clearAuthStorage();
    }

    return Promise.reject(error);
  }
);

export default api;
