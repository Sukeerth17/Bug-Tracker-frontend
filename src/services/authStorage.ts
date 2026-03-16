import { User } from '@/data/models';

const AUTH_TOKEN_KEY = 'ticket.auth.token';
const AUTH_USER_KEY = 'ticket.auth.user';
const AUTH_REMEMBER_KEY = 'ticket.auth.remember';

function resolveStorage() {
  const remember = localStorage.getItem(AUTH_REMEMBER_KEY);
  return remember === 'true' ? localStorage : sessionStorage;
}

export function setRememberMe(remember: boolean) {
  localStorage.setItem(AUTH_REMEMBER_KEY, remember ? 'true' : 'false');
}

export function getAuthToken(): string {
  const storage = resolveStorage();
  return storage.getItem(AUTH_TOKEN_KEY)
    || localStorage.getItem(AUTH_TOKEN_KEY)
    || sessionStorage.getItem(AUTH_TOKEN_KEY)
    || '';
}

export function setAuthToken(token: string, remember?: boolean) {
  if (typeof remember === 'boolean') {
    setRememberMe(remember);
  }
  const storage = resolveStorage();
  if (!token) {
    storage.removeItem(AUTH_TOKEN_KEY);
    return;
  }
  storage.setItem(AUTH_TOKEN_KEY, token);
}

export function getAuthUser(): User | null {
  const storage = resolveStorage();
  const raw = storage.getItem(AUTH_USER_KEY)
    || localStorage.getItem(AUTH_USER_KEY)
    || sessionStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export function setAuthUser(user: User | null, remember?: boolean) {
  if (typeof remember === 'boolean') {
    setRememberMe(remember);
  }
  const storage = resolveStorage();
  if (!user) {
    storage.removeItem(AUTH_USER_KEY);
    return;
  }
  storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_REMEMBER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
  sessionStorage.removeItem(AUTH_TOKEN_KEY);
  sessionStorage.removeItem(AUTH_USER_KEY);
}
