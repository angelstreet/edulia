import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { createLiveSession, type LiveSession } from '../../../api/liveSessions';
import { getActivity, type ActivityData } from '../../../api/activities';
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

export function SessionLaunchPage() {
  const { id: activityId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [joinedStudents, setJoinedStudents] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const { readyState, lastMessage, send } = useSessionSocket(session?.join_code ?? null);

  // Load activity and create session on mount
  useEffect(() => {
    if (!activityId) return;
    Promise.all([getActivity(activityId), createLiveSession(activityId)])
      .then(([actRes, sessRes]) => {
        setActivity(actRes.data);
        setSession(sessRes.data);
      })
      .catch(() => {
        setError(t('saveError', 'Could not save. Please try again.'));
      })
      .finally(() => setLoading(false));
  }, [activityId, t]);

  // Listen for student_joined WS events
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'student_joined') {
      const userId = lastMessage.data?.user_id as string | undefined;
      if (userId) {
        const truncated = userId.slice(0, 8);
        setJoinedStudents((prev) =>
          prev.includes(truncated) ? prev : [...prev, truncated],
        );
      }
    }
  }, [lastMessage]);

  const handleStart = () => {
    if (!session) return;
    send({ type: 'next_question', data: {} });
    navigate(`/session/${session.join_code}/live`);
  };

  const handleCancel = () => {
    navigate(`/activities/${activityId}/results`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="max-w-lg mx-auto py-12 text-center">
        <p className="text-destructive">{error ?? t('error', 'Error')}</p>
        <Button variant="secondary" className="mt-4" onClick={() => navigate(-1)}>
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto py-8 flex flex-col gap-6">
      {/* Back link */}
      <Link
        to={`/activities/${activityId}/results`}
        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
      >
        ← {t('activities', 'Activities')}
      </Link>

      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold">{activity?.title ?? '—'}</h1>
        <p className="text-muted-foreground mt-1">{t('liveSession', 'Live Session')}</p>
      </div>

      {/* Join code */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {t('joinCode', 'Join code')}
        </span>
        <div className="inline-flex items-center justify-center px-6 py-4 border-2 border-primary rounded-xl bg-primary/5 w-fit">
          <span className="text-4xl font-mono font-bold tracking-widest text-primary">
            {session.join_code}
          </span>
        </div>
      </div>

      {/* Students joined */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">
          {t('studentsJoined', 'Students joined')}: {joinedStudents.length}
        </span>
        {joinedStudents.length > 0 && (
          <ul className="flex flex-col gap-1">
            {joinedStudents.map((id) => (
              <li key={id} className="text-sm text-muted-foreground">
                • {id}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* WS status */}
      <WsStatusDot state={readyState} />

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-2">
        <Button
          variant="primary"
          disabled={joinedStudents.length === 0}
          onClick={handleStart}
        >
          {t('startSession', 'Start Session')} →
        </Button>
        <Button variant="secondary" onClick={handleCancel}>
          {t('cancel', 'Cancel')}
        </Button>
      </div>
    </div>
  );
}
