import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/controlApi';

export interface DashboardSummary {
  totalTickets: number;
  openTickets: number;
  closedTickets: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byProject: Record<string, number>;
  byAssignee: Record<string, number>;
}

export const dashboardApi = {
  async getSummary(projectId?: string): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>(API_ENDPOINTS.dashboardSummary, {
      params: projectId ? { projectId } : undefined,
    });
    return response.data;
  },
};

