import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

export function UnreadMessages() {
  const { t } = useTranslation();
  const count = 3; // mock

  return (
    <Card title={t('messages')}>
      <div className="widget-unread">
        <span className="unread-count">{count}</span>
        <span>{t('unreadMessages', 'unread messages')}</span>
      </div>
    </Card>
  );
}
