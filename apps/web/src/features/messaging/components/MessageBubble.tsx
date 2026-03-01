import { Avatar } from '../../../components/ui/Avatar';

interface MessageBubbleProps {
  senderName: string;
  senderAvatar: string | null;
  content: string;
  time: string;
  isMine: boolean;
}

export function MessageBubble({ senderName, senderAvatar, content, time, isMine }: MessageBubbleProps) {
  return (
    <div className={`message-bubble ${isMine ? 'message-bubble--mine' : 'message-bubble--other'}`}>
      {!isMine && <Avatar src={senderAvatar} name={senderName} size="sm" />}
      <div className="message-bubble-body">
        {!isMine && <span className="message-sender">{senderName}</span>}
        <div className="message-content">{content}</div>
        <span className="message-time">{new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
