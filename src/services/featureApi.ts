import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/controlApi';

export interface FeatureItem {
  id: string;
  projectId: string;
  name: string;
  createdAt: string;
  createdByUserId: number;
}

export const featureApi = {
  async getFeatures(projectId: string, q?: string): Promise<FeatureItem[]> {
    const response = await api.get<FeatureItem[]>(API_ENDPOINTS.features, { params: { projectId, q: q || undefined } });
    return response.data.map((row) => ({ ...row, id: String(row.id) }));
  },

  async createFeature(projectId: string, name: string): Promise<FeatureItem> {
    const response = await api.post<FeatureItem>(API_ENDPOINTS.features, { projectId, name });
    return { ...response.data, id: String(response.data.id) };
  },

  async deleteFeature(projectId: string, featureId: string | number): Promise<void> {
    await api.delete(API_ENDPOINTS.featureById.replace('{featureId}', String(featureId)), {
      params: { projectId },
    });
  },
};
