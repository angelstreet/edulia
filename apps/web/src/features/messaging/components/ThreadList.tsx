import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ThreadData } from '../../../api/messages';
import { MessageCircle, Bell, Users } from 'lucide-react';

interface ThreadListProps {
  threads: ThreadData[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const typeIcons: Record<string, typeof MessageCircle> = {
  direct: MessageCircle,
  announcement: Bell,
  group: Users,
};

export function ThreadList({ threads, selectedId, onSelect }: ThreadListProps) {
  const { t } = useTranslation();

  if (threads.length === 0) {
    return <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">{t('noThreads', 'No messages yet.')}</div>;
  }

  return (
    <div className="flex flex-col">
      {threads.map((th) => {
        const isActive = th.id === selectedId;
        const isUnread = th.unread_count > 0 || (th as any).unread === true;
        const Icon = typeIcons[th.type] || MessageCircle;
        const participantCount = (th as any).participant_count ?? th.participants?.length ?? 0;
        const lastMsg = th.last_message;
        const date = lastMsg?.created_at || (th as any).created_at;

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
            <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0',
              th.type === 'announcement' ? 'bg-amber-100 text-amber-700' : 'bg-primary/10 text-primary')}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm truncate">{th.subject || 'Message'}</span>
                <span className="text-[0.6875rem] text-muted-foreground shrink-0">
                  {date ? new Date(date).toLocaleDateString('fr-FR') : ''}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate mt-0.5">
                {lastMsg ? `${lastMsg.sender_name}: ${lastMsg.content}` 
                  : `${participantCount} participant${participantCount > 1 ? 's' : ''}`}
              </div>
            </div>
            {isUnread && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-2" />}
          </div>
        );
      })}
    </div>
  );
}
