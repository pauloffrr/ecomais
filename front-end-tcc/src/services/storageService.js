import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const canUseSecureStore = async () => {
  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
};

const getItem = async (key) => {
  if (await canUseSecureStore()) {
    return SecureStore.getItemAsync(key);
  }

  return AsyncStorage.getItem(key);
};

const setItem = async (key, value) => {
  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(key, value);
    return;
  }

  await AsyncStorage.setItem(key, value);
};

const removeItem = async (key) => {
  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(key);
    return;
  }

  await AsyncStorage.removeItem(key);
};

export const getToken = async () => {
  try {
    return await getItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error getting auth token', error);
    return null;
  }
};

export const setToken = async (token) => {
  try {
    await setItem(TOKEN_KEY, token);
  } catch (error) {
    console.error('Error setting auth token', error);
  }
};

export const removeToken = async () => {
  try {
    await removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Error removing auth token', error);
  }
};

export const getUser = async () => {
  try {
    const user = await getItem(USER_KEY);
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('Error getting auth user', error);
    return null;
  }
};

export const setUser = async (user) => {
  try {
    await setItem(USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error setting auth user', error);
  }
};

export const removeUser = async () => {
  try {
    await removeItem(USER_KEY);
  } catch (error) {
    console.error('Error removing auth user', error);
  }
};

export const clearAuthStorage = async () => {
  await Promise.all([removeToken(), removeUser()]);
};
