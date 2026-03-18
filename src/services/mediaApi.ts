import api from '@/services/api';
import { API_ENDPOINTS } from '@/services/controlApi';

export interface MediaUploadResult {
  id: string;
  filename: string;
  sizeBytes: number;
  contentType: string;
  createdAt: string;
}

export const mediaApi = {
  async upload(file: File): Promise<MediaUploadResult> {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<MediaUploadResult>(API_ENDPOINTS.mediaUpload, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { ...response.data, id: String(response.data.id) };
  },

  async getUrl(id: string): Promise<{ url: string; expiresAt: string; filename: string; contentType: string; sizeBytes: number }> {
    const response = await api.get<{ url: string; expiresAt: string; filename: string; contentType: string; sizeBytes: number }>(
      API_ENDPOINTS.mediaUrl.replace('{id}', id)
    );
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(API_ENDPOINTS.mediaById.replace('{id}', id));
  },
};
