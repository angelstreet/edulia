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
      setThreads(data.data);
      setTotalPages(data.meta.total_pages);
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
      setThread(data.thread);
      setMessages(data.messages);
    } catch {
      // API not connected
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { thread, messages, loading, refresh: fetch };
}
