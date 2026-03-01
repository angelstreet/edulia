import type { BaseEntity, TenantScoped, ThreadType, ParticipantRole } from './common';

export interface Attachment {
  name: string;
  url: string;
  size: number;
  mime: string;
}

export interface Thread extends BaseEntity, TenantScoped {
  type: ThreadType;
  subject: string | null;
  created_by: string;
}

export interface ThreadParticipant {
  id: string;
  thread_id: string;
  user_id: string;
  role: ParticipantRole;
  read_at: string | null;
  archived: boolean;
}

export interface Message extends BaseEntity {
  thread_id: string;
  sender_id: string;
  body: string;
  attachments: Attachment[];
  edited_at: string | null;
}
