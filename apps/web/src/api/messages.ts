import client from './client';

export interface ThreadData {
  id: string;
  subject: string;
  type: string;
  participants: { id: string; display_name: string; avatar_url: string | null }[];
  last_message: { content: string; sender_name: string; created_at: string } | null;
  unread_count: number;
  updated_at: string;
}

export interface MessageData {
  id: string;
  thread_id: string;
  sender_id: string;
  sender_name: string;
  sender_avatar: string | null;
  content: string;
  created_at: string;
}

export interface PaginatedThreads {
  data: ThreadData[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

export function getThreads(params: { page?: number; per_page?: number } = {}) {
  return client.get<PaginatedThreads>('/v1/threads', { params });
}

export function getThread(id: string) {
  return client.get<{ thread: ThreadData; messages: MessageData[] }>(`/v1/threads/${id}`);
}

export function createThread(data: { participant_ids: string[]; subject: string; body: string }) {
  return client.post<ThreadData>('/v1/threads', data);
}

export function replyToThread(threadId: string, body: string) {
  return client.post<MessageData>(`/v1/threads/${threadId}/messages`, { content: body });
}

export function markThreadRead(threadId: string) {
  return client.patch(`/v1/threads/${threadId}/read`);
}
