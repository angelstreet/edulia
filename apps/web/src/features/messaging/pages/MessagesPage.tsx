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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('messages')}</h1>
        <Button variant="primary" onClick={() => setShowCompose(true)}>
          + {t('newMessage', 'New message')}
        </Button>
      </div>

      <div className="flex border rounded-lg bg-card overflow-hidden h-[calc(100vh-12rem)]">
        <div className="w-80 border-r overflow-y-auto shrink-0 max-md:w-full max-md:border-r-0 max-md:border-b max-md:max-h-72">
          {listLoading ? (
            <div className="flex justify-center py-12"><Spinner size="sm" /></div>
          ) : (
            <ThreadList threads={threads} selectedId={selectedId} onSelect={setSelectedId} />
          )}
        </div>
        <div className="flex-1 flex flex-col overflow-hidden max-md:min-h-64">
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
