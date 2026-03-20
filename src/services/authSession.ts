import { clearAuthStorage } from '@/services/authStorage';

let redirectInProgress = false;

export function handleSessionExpired() {
  if (typeof window === 'undefined') return;
  if (redirectInProgress) return;
  redirectInProgress = true;

  clearAuthStorage();
  window.dispatchEvent(new CustomEvent('auth:expired'));

  if (window.location.pathname !== '/login') {
    window.location.replace('/login?reason=session-expired');
    return;
  }
  window.location.reload();
}

