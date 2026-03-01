import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../components/ui/Avatar';
import type { ThreadData } from '../../../api/messages';

interface ThreadListProps {
  threads: ThreadData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ThreadList({ threads, selectedId, onSelect }: ThreadListProps) {
  const { t } = useTranslation();

  if (threads.length === 0) {
    return <div className="thread-list-empty">{t('noThreads', 'No messages yet.')}</div>;
  }

  return (
    <div className="thread-list">
      {threads.map((th) => {
        const isActive = th.id === selectedId;
        const isUnread = th.unread_count > 0;
        const otherParticipants = th.participants.slice(0, 2);
        const names = otherParticipants.map((p) => p.display_name).join(', ');

        return (
          <div
            key={th.id}
            className={`thread-item ${isActive ? 'thread-item--active' : ''} ${isUnread ? 'thread-item--unread' : ''}`}
            onClick={() => onSelect(th.id)}
          >
            <Avatar src={otherParticipants[0]?.avatar_url} name={names} size="md" />
            <div className="thread-item-body">
              <div className="thread-item-top">
                <span className="thread-item-name">{th.subject || names}</span>
                <span className="thread-item-time">
                  {th.last_message ? new Date(th.last_message.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="thread-item-preview">
                {th.last_message ? `${th.last_message.sender_name}: ${th.last_message.content}` : t('noMessages', 'No messages')}
              </div>
            </div>
            {isUnread && <span className="thread-unread-badge">{th.unread_count}</span>}
          </div>
        );
      })}
    </div>
  );
}
