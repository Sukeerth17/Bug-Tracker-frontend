const ENV_API_BASE_URL = ((import.meta as any).env?.VITE_API_URL as string | undefined)?.trim();
const ENV_REQUESTER_USER_ID = ((import.meta as any).env?.VITE_REQUESTER_USER_ID as string | undefined)?.trim();
const REQUESTER_USER_ID_KEY = 'ticket.requester.userId';

export const API_ENDPOINTS = {
  health: '/health',
  users: '/users',
  tickets: '/tickets',
  ticketById: '/tickets/{ticketId}',
  ticketStatus: '/tickets/{ticketId}/status',
  ticketAssignees: '/tickets/{ticketId}/assignees',
  ticketDetails: '/tickets/{ticketId}/details',
  ticketAttachments: '/tickets/{ticketId}/attachments',
  ticketComments: '/tickets/{ticketId}/comments',
  ticketActivity: '/tickets/{ticketId}/activity',
  mediaUpload: '/media/upload',
  mediaUrl: '/media/{id}/url',
  mediaById: '/media/{id}',
  activity: '/tickets/activity',
  summary: '/tickets/summary',
  projects: '/projects',
  projectById: '/projects/{projectId}',
  userById: '/users/{userId}',
  notifications: '/notifications',
  notificationRead: '/notifications/{notificationId}/read',
  notificationStream: '/notifications/stream',
  dashboardSummary: '/dashboard/summary',
  features: '/features',
  featureById: '/features/{featureId}',
};

export function getApiBaseUrl(): string {
  return ENV_API_BASE_URL || 'http://localhost:8080/api';
}

export function setApiBaseUrl(_url: string) {
  // Env-only mode: base URL is controlled by VITE_API_URL.
}

export function getRequesterUserId(): string {
  if (ENV_REQUESTER_USER_ID) {
    return ENV_REQUESTER_USER_ID;
  }
  if (typeof window !== 'undefined') {
    return window.localStorage.getItem(REQUESTER_USER_ID_KEY)
      || window.sessionStorage.getItem(REQUESTER_USER_ID_KEY)
      || '1';
  }
  return '1';
}

export function setRequesterUserId(userId: string) {
  if (ENV_REQUESTER_USER_ID || typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(REQUESTER_USER_ID_KEY, userId);
  window.sessionStorage.setItem(REQUESTER_USER_ID_KEY, userId);
}
