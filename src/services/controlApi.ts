export const API_CONTROL_KEYS = {
  baseUrl: 'ticket.api.baseUrl',
  requesterUserId: 'ticket.api.requesterUserId',
};

export const API_ENDPOINTS = {
  health: '/health',
  users: '/users',
  tickets: '/tickets',
  ticketById: '/tickets/{ticketId}',
  ticketStatus: '/tickets/{ticketId}/status',
  ticketAssignees: '/tickets/{ticketId}/assignees',
  ticketStar: '/tickets/{ticketId}/star',
  ticketComments: '/tickets/{ticketId}/comments',
  activity: '/tickets/activity',
  summary: '/tickets/summary',
  projects: '/projects',
  projectById: '/projects/{projectId}',
  googleOnboardUser: '/users/google-onboard',
  userById: '/users/{userId}',
  notifications: '/notifications',
  notificationRead: '/notifications/{notificationId}/read',
  notificationStream: '/notifications/stream',
  dashboardSummary: '/dashboard/summary',
};

export function getApiBaseUrl(): string {
  return localStorage.getItem(API_CONTROL_KEYS.baseUrl) || 'http://localhost:8080/api';
}

export function setApiBaseUrl(url: string) {
  localStorage.setItem(API_CONTROL_KEYS.baseUrl, url.trim() || 'http://localhost:8080/api');
}

export function getRequesterUserId(): string { 
  return localStorage.getItem(API_CONTROL_KEYS.requesterUserId) || '1';
}

export function setRequesterUserId(userId: string) {
  localStorage.setItem(API_CONTROL_KEYS.requesterUserId, userId.trim() || '1');
}
