import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

export function UnreadMessages() {
  const { t } = useTranslation();
  const count = 3; // mock

  return (
    <Card title={t('messages')}>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-2xl font-bold">{count}</span>
        <span className="text-muted-foreground">{t('unreadMessages', 'unread messages')}</span>
      </div>
    </Card>
  );
}
