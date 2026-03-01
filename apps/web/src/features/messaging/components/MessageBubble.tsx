import { Avatar } from '../../../components/ui/Avatar';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  senderName: string;
  senderAvatar: string | null;
  content: string;
  time: string;
  isMine: boolean;
}

export function MessageBubble({ senderName, senderAvatar, content, time, isMine }: MessageBubbleProps) {
  return (
    <div className={cn('flex gap-2 max-w-[70%]', isMine && 'ml-auto flex-row-reverse')}>
      {!isMine && <Avatar src={senderAvatar} name={senderName} size="sm" />}
      <div>
        {!isMine && <span className="text-[0.6875rem] font-semibold block mb-0.5">{senderName}</span>}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl text-sm leading-snug',
            isMine
              ? 'bg-primary text-primary-foreground rounded-br-sm'
              : 'bg-muted rounded-bl-sm'
          )}
        >
          {content}
        </div>
        <span className={cn(
          'text-[0.625rem] mt-1 block',
          isMine ? 'text-right text-muted-foreground' : 'text-muted-foreground'
        )}>
          {new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}
