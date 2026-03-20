import axios from 'axios';
import { getApiBaseUrl, getRequesterUserId } from '@/services/controlApi';
import { getAuthToken } from '@/services/authStorage';
import { handleSessionExpired } from '@/services/authSession';

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  config.headers = config.headers ?? {};
  config.headers['X-User-Id'] = getRequesterUserId();
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const requestUrl = String(error?.config?.url || '');
    const isAuthEndpoint = requestUrl.includes('/auth/login')
      || requestUrl.includes('/auth/signup')
      || requestUrl.includes('/auth/forgot-password')
      || requestUrl.includes('/auth/reset-password');
    if ((status === 401 || status === 403) && !isAuthEndpoint) {
      handleSessionExpired();
    }
    return Promise.reject(error);
  },
);

export default api;
