import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/controlApi';

export interface ProjectItem {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  createdByUserId: number;
  createdAt: string;
}

export const projectApi = {
  async getProjects(): Promise<ProjectItem[]> {
    const response = await api.get<ProjectItem[]>(API_ENDPOINTS.projects);
    return response.data;
  },

  async createProject(payload: { name: string; description?: string; startDate?: string }) {
    const response = await api.post<ProjectItem>(API_ENDPOINTS.projects, payload);
    return response.data;
  },

  async deleteProject(projectId: string) {
    await api.delete(API_ENDPOINTS.projectById.replace('{projectId}', projectId));
  },
};
