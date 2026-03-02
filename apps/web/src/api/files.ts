import client from './client';

export interface FileData {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  url: string;
  category: string;
  source_module: string | null;
  created_at: string;
}

export interface CategoryCount {
  category: string;
  count: number;
}

export function uploadFile(file: File, onProgress?: (pct: number) => void) {
  const form = new FormData();
  form.append('file', file);
  return client.post<FileData>('/v1/files/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
}

export function getFiles(params: { category?: string } = {}) {
  return client.get<FileData[]>('/v1/files', { params });
}

export function getCategories() {
  return client.get<CategoryCount[]>('/v1/files/categories');
}

export function getFile(id: string) {
  return client.get<FileData>(`/v1/files/${id}`);
}

export function downloadFile(id: string) {
  return client.get<{ url: string }>(`/v1/files/${id}/download`);
}

export function deleteFile(id: string) {
  return client.delete(`/v1/files/${id}`);
}
