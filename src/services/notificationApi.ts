import api from '@/services/api';
import { API_ENDPOINTS, getApiBaseUrl } from '@/services/controlapi';
import { getAuthToken } from '@/services/authStorage';

export interface NotificationItem {
  id: number;
  eventType: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  ticketId: string | null;
  ticketTitle: string | null;
}

interface NotificationPage {
  items: NotificationItem[];
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
}

export const notificationApi = {
  async getNotifications(page = 0, size = 50): Promise<NotificationItem[]> {
    const response = await api.get<NotificationPage>(API_ENDPOINTS.notifications, { params: { page, size } });
    return response.data.items || [];
  },

  async markRead(notificationId: number): Promise<NotificationItem> {
    const response = await api.patch<NotificationItem>(
      API_ENDPOINTS.notificationRead.replace('{notificationId}', String(notificationId)),
    );
    return response.data;
  },

  subscribe(onMessage: (item: NotificationItem) => void): EventSource | null {
    const token = getAuthToken();
    if (!token) {
      return null;
    }
    const url = `${getApiBaseUrl()}${API_ENDPOINTS.notificationStream}?access_token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    es.addEventListener('notification', (event) => {
      try {
        onMessage(JSON.parse((event as MessageEvent).data) as NotificationItem);
      } catch {
        // ignore malformed SSE payloads
      }
    });
    return es;
  },
};
