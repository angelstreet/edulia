import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

export interface WSMessage {
  type: string;
  data: Record<string, unknown>;
  from?: 'teacher' | 'student';
}

export type ReadyState = 'connecting' | 'open' | 'closed' | 'error';

export function useSessionSocket(joinCode: string | null) {
  const [readyState, setReadyState] = useState<ReadyState>('closed');
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // accessToken is the JWT access token field in authStore
  const token = useAuthStore((s) => s.accessToken);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!joinCode || !token) return;

    // Build WS URL — replace http(s) with ws(s)
    // VITE_API_URL may be a full URL like http://localhost:8000/api,
    // or a relative path like /api. Handle both cases.
    const apiBase = import.meta.env.VITE_API_URL as string | undefined;
    let wsBase: string;
    if (apiBase && /^https?:\/\//.test(apiBase)) {
      // Absolute URL: replace scheme
      wsBase = apiBase.replace(/^http/, 'ws');
    } else {
      // Relative path: use window.location.origin
      wsBase = window.location.origin.replace(/^http/, 'ws') + (apiBase ?? '/api');
    }

    const url = `${wsBase}/ws/session/${joinCode}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;
    setReadyState('connecting');

    ws.onopen = () => setReadyState('open');
    ws.onclose = () => setReadyState('closed');
    ws.onerror = () => setReadyState('error');
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WSMessage;
        setLastMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    return () => {
      ws.close();
      wsRef.current = null;
      setReadyState('closed');
    };
  }, [joinCode, token]);

  return { readyState, lastMessage, send };
}
