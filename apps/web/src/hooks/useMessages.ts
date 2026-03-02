import { useState, useEffect, useCallback } from 'react';
import { getThreads, getThread, type ThreadData, type MessageData } from '../api/messages';

export function useThreadList(page = 1) {
  const [threads, setThreads] = useState<ThreadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPages, setTotalPages] = useState(1);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getThreads({ page, per_page: 20 });
      if (Array.isArray(data)) {
        setThreads(data);
        setTotalPages(1);
      } else {
        setThreads(data.data ?? []);
        setTotalPages(data.meta?.total_pages ?? 1);
      }
    } catch {
      setThreads([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);
  return { threads, loading, totalPages, refresh: fetch };
}

export function useThread(threadId: string | null) {
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    try {
      const { data } = await getThread(threadId);
      // API returns thread with messages array, messages have 'body' not 'content'
      const rawMessages = data.messages ?? (data as any).messages ?? [];
      const normalizedMessages = rawMessages.map((m: any) => ({
        id: m.id,
        thread_id: m.thread_id,
        sender_id: m.sender_id,
        sender_name: m.sender_name ?? '',
        sender_avatar: m.sender_avatar ?? null,
        content: m.content ?? m.body ?? '',
        created_at: m.created_at,
      }));
      
      if (data.thread) {
        setThread(data.thread);
      } else {
        setThread(data as unknown as ThreadData);
      }
      setMessages(normalizedMessages);
    } catch {
      setThread(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { fetch(); }, [fetch]);
  return { thread, messages, loading, refresh: fetch };
}
