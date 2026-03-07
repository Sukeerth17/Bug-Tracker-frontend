import api from '@/services/api';
import { setRequesterUserId } from '@/services/controlapi';
import { clearAuthStorage, setAuthToken, setAuthUser } from '@/services/authStorage';
import { User } from '@/data/models';

interface AuthResponse {
  token: string;
  user: {
    id: number;
    name: string;
    email: string;
    avatar: string;
    role: 'USER' | 'SUPER_ADMIN';
  };
}

function mapUser(user: AuthResponse['user']): User {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    role: user.role,
  };
}

function persistAuth(response: AuthResponse): User {
  const user = mapUser(response.user);
  setAuthToken(response.token);
  setAuthUser(user);
  setRequesterUserId(user.id);
  return user;
}

export const authService = {
  async signup(payload: { name: string; email: string; password: string; avatar: string; role?: 'USER' | 'SUPER_ADMIN' }) {
    const response = await api.post<{ message: string }>('/auth/signup', payload);
    return response.data.message;
  },

  async login(payload: { email: string; password: string }) {
    const response = await api.post<AuthResponse>('/auth/login', payload);
    return persistAuth(response.data);
  },

  async forgotPassword(email: string) {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data.message;
  },

  async resetPassword(email: string, token: string, newPassword: string) {
    const response = await api.post<{ message: string }>('/auth/reset-password', { email, token, newPassword });
    return response.data.message;
  },

  logout() {
    clearAuthStorage();
  },
};
