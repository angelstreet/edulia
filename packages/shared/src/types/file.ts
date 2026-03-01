import type { BaseEntity, TenantScoped, FileVisibility } from './common';

export interface File extends BaseEntity, TenantScoped {
  uploaded_by: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  storage_key: string;
  folder: string | null;
  visibility: FileVisibility;
  context_type: string | null;
  context_id: string | null;
}
