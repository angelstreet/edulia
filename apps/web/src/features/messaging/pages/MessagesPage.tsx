import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { ThreadList } from '../components/ThreadList';
import { ThreadView } from '../components/ThreadView';
import { ComposeMessage } from '../components/ComposeMessage';
import { useThreadList, useThread } from '../../../hooks/useMessages';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

export function MessagesPage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const { threads, loading: listLoading, refresh: refreshList } = useThreadList();
  const { thread, messages, loading: threadLoading, refresh: refreshThread } = useThread(selectedId);

  return (
    <div className="messages-page">
      <div className="page-header">
        <h1>{t('messages')}</h1>
        <Button variant="primary" onClick={() => setShowCompose(true)}>
          + {t('newMessage', 'New message')}
        </Button>
      </div>

      <div className="messages-layout">
        <div className="messages-sidebar">
          {listLoading ? (
            <div className="page-center"><Spinner size="sm" /></div>
          ) : (
            <ThreadList threads={threads} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
        <div className="messages-main">
          <ThreadView
            thread={thread}
            messages={messages}
            loading={threadLoading}
            currentUserId={user?.id || ''}
            onReply={refreshThread}
          />
        </div>
      </div>

      <ComposeMessage
        open={showCompose}
        onClose={() => setShowCompose(false)}
        onSent={refreshList}
      />
    </div>
  );
}
