import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { MessageBubble } from './MessageBubble';
import { replyToThread } from '../../../api/messages';
import type { ThreadData, MessageData } from '../../../api/messages';

interface ThreadViewProps {
  thread: ThreadData | null;
  messages: MessageData[];
  loading: boolean;
  currentUserId: string;
  onReply: () => void;
}

export function ThreadView({ thread, messages, loading, currentUserId, onReply }: ThreadViewProps) {
  const { t } = useTranslation();
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!thread) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">{t('selectThread', 'Select a conversation')}</p>
      </div>
    );
  }

  if (loading) {
    return <div className="flex justify-center py-12"><Spinner /></div>;
  }

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    try {
      await replyToThread(thread.id, reply);
      setReply('');
      onReply();
    } catch { /* ignore */ }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border">
        <h3 className="font-semibold text-sm">{thread.subject || thread.participants.map((p) => p.display_name).join(', ')}</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            senderName={m.sender_name}
            senderAvatar={m.sender_avatar}
            content={m.content}
            time={m.created_at}
            isMine={m.sender_id === currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <form className="px-4 py-3 border-t border-border flex gap-2" onSubmit={handleSend}>
        <input
          type="text"
          className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
          placeholder={t('typeMessage', 'Type a message...')}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
        />
        <Button type="submit" variant="primary" loading={sending}>{t('send', 'Send')}</Button>
      </form>
    </div>
  );
}
