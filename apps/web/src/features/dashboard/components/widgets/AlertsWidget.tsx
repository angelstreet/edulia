import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';

const MOCK_ALERTS = [
  { type: 'absence', text: '2 absences non justifiées', variant: 'danger' as const },
  { type: 'grade', text: 'Nouvelle note en Mathématiques: 16/20', variant: 'info' as const },
  { type: 'message', text: 'Message de M. Dupont', variant: 'default' as const },
];

export function AlertsWidget() {
  const { t } = useTranslation();

  return (
    <Card title={t('alerts', 'Alerts')}>
      <div className="widget-alerts">
        {MOCK_ALERTS.map((a, i) => (
          <div key={i} className="alert-item">
            <Badge variant={a.variant}>{a.type}</Badge>
            <span>{a.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
