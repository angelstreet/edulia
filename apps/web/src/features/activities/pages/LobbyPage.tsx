import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { getLiveSession, type LiveSession } from '../../../api/liveSessions';
import { useSessionSocket } from '../../../hooks/useSessionSocket';

function WsStatusDot({ state }: { state: 'connecting' | 'open' | 'closed' | 'error' }) {
  const { t } = useTranslation();
  const colorMap = {
    connecting: 'bg-yellow-400',
    open: 'bg-green-500',
    closed: 'bg-slate-400',
    error: 'bg-red-500',
  };
  const labelMap = {
    connecting: t('connecting', 'Connecting…'),
    open: t('connected', 'Connected'),
    closed: t('disconnected', 'Disconnected'),
    error: t('disconnected', 'Disconnected'),
  };
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className={`inline-block h-2.5 w-2.5 rounded-full ${colorMap[state]}`} />
      {labelMap[state]}
    </span>
  );
}

export function LobbyPage() {
  const { code: joinCode } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { readyState, lastMessage } = useSessionSocket(joinCode ?? null);

  // Fetch session info on mount
  useEffect(() => {
    if (!joinCode) return;
    getLiveSession(joinCode)
      .then((res) => setSession(res.data))
      .catch(() => setError(t('sessionNotFound', 'Session not found. Check the code and try again.')))
      .finally(() => setLoading(false));
  }, [joinCode, t]);

  // Navigate when session starts
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'state_change' || lastMessage.type === 'next_question') {
      navigate(`/session/${joinCode}/question`);
    }
  }, [lastMessage, joinCode, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-sm mx-auto py-12 text-center">
        <p className="text-destructive">{error ?? t('error', 'Error')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Session info */}
        <div>
          <p className="text-sm text-muted-foreground">
            {t('joinCode', 'Join code')}: {session.join_code}
          </p>
        </div>

        {/* Waiting message */}
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <span className="text-4xl">⏳</span>
          <p className="text-lg font-medium">
            {t('waitingForTeacher', 'Waiting for the teacher to start…')}
          </p>
        </div>

        {/* WS status */}
        <div className="flex justify-center">
          <WsStatusDot state={readyState} />
        </div>
      </div>
    </div>
  );
}
