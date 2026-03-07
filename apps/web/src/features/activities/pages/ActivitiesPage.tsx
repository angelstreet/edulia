import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { getActivities, type ActivityData } from '../../../api/activities';
import { getGroups, type GroupData } from '../../../api/groups';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

function getStatusVariant(status: string): 'warning' | 'success' | 'default' {
  if (status === 'draft') return 'warning';
  if (status === 'published') return 'success';
  return 'default';
}

function getTypeLabel(type: string, t: (key: string, fallback: string) => string): string {
  if (type === 'qcm') return t('qcm', 'QCM');
  if (type === 'poll') return t('poll', 'Poll');
  return type;
}

function getStatusLabel(status: string, t: (key: string, fallback: string) => string): string {
  if (status === 'draft') return t('draft', 'Draft');
  if (status === 'published') return t('published', 'Published');
  if (status === 'closed') return t('closed', 'Closed');
  return status;
}

export function ActivitiesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useCurrentUser();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getActivities(), getGroups()]).then(([actRes, grpRes]) => {
      setActivities(Array.isArray(actRes.data) ? actRes.data : []);
      const grpList = Array.isArray(grpRes.data) ? grpRes.data : grpRes.data.data ?? [];
      setGroups(grpList);
    }).catch(() => {
      setActivities([]);
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

  const handleCardClick = (activity: ActivityData) => {
    if (isTeacher) {
      navigate(`/activities/${activity.id}/results`);
    }
  };

  const handleStartClick = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    navigate(`/activities/${activityId}/attempt`);
  };

  const handleLaunchLive = (e: React.MouseEvent, activityId: string) => {
    e.stopPropagation();
    navigate(`/activities/${activityId}/launch`);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('activities', 'Activities')}</h1>
        {isTeacher && (
          <Button variant="primary" onClick={() => navigate('/activities/new')}>
            + {t('newActivity', 'New Activity')}
          </Button>
        )}
      </div>

      {activities.length === 0 ? (
        <EmptyState
          title={t('noActivities', 'No activities yet')}
          description={t('noActivitiesDesc', 'Activities assigned to your class will appear here.')}
        />
      ) : (
        <div className="flex flex-col gap-2">
          {activities.map((activity) => {
            const group = activity.group_id ? groupMap[activity.group_id] : null;
            return (
              <div
                key={activity.id}
                className={`flex items-center justify-between p-4 border rounded-lg bg-card transition-colors ${isTeacher ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                onClick={() => handleCardClick(activity)}
              >
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium truncate">{activity.title}</span>
                    <Badge variant="default">{getTypeLabel(activity.type, t)}</Badge>
                    {isTeacher && (
                      <Badge variant={getStatusVariant(activity.status)}>
                        {getStatusLabel(activity.status, t)}
                      </Badge>
                    )}
                  </div>
                  {group && (
                    <span className="text-sm text-muted-foreground">{group.name}</span>
                  )}
                </div>
                {isTeacher && activity.status === 'published' && (
                  <div className="shrink-0 ml-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={(e) => handleLaunchLive(e, activity.id)}
                    >
                      {t('launchLive', 'Launch Live')}
                    </Button>
                  </div>
                )}
                {!isTeacher && activity.status === 'published' && (
                  <div className="shrink-0 ml-3">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={(e) => handleStartClick(e, activity.id)}
                    >
                      + {t('startActivity', 'Start')}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
