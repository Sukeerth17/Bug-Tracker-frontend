import axios from 'axios';
import { getApiBaseUrl, getRequesterUserId } from '@/services/controlapi';
import { getAuthToken } from '@/services/authStorage';

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

export default api;
