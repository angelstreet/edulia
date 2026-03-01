import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../components/ui/Avatar';
import { cn } from '@/lib/utils';
import type { ThreadData } from '../../../api/messages';

interface ThreadListProps {
  threads: ThreadData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ThreadList({ threads, selectedId, onSelect }: ThreadListProps) {
  const { t } = useTranslation();

  if (threads.length === 0) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">{t('noThreads', 'No messages yet.')}</div>;
  }

  return (
    <div className="flex flex-col">
      {threads.map((th) => {
        const isActive = th.id === selectedId;
        const isUnread = th.unread_count > 0;
        const otherParticipants = th.participants.slice(0, 2);
        const names = otherParticipants.map((p) => p.display_name).join(', ');

        return (
          <div
            key={th.id}
            className={cn(
              'flex items-start gap-3 px-4 py-3 border-b border-border cursor-pointer transition-colors hover:bg-muted/50',
              isActive && 'bg-primary/5',
              isUnread && 'font-semibold'
            )}
            onClick={() => onSelect(th.id)}
          >
            <Avatar src={otherParticipants[0]?.avatar_url} name={names} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{th.subject || names}</span>
                <span className="text-[0.6875rem] text-muted-foreground shrink-0">
                  {th.last_message ? new Date(th.last_message.created_at).toLocaleDateString() : ''}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {th.last_message ? `${th.last_message.sender_name}: ${th.last_message.content}` : t('noMessages', 'No messages')}
              </div>
            </div>
            {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
          </div>
        );
      })}
    </div>
  );
}
