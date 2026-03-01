import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

const MOCK_HW = [
  { subject: 'Mathématiques', title: 'Exercices p.142', due: '2026-03-03', color: '#4A90D9' },
  { subject: 'Français', title: 'Lire chapitre 8', due: '2026-03-04', color: '#E74C3C' },
  { subject: 'Anglais', title: 'Essay: My City', due: '2026-03-05', color: '#9B59B6' },
];

export function HomeworkDue() {
  const { t } = useTranslation();

  return (
    <Card title={t('homeworkDue', 'Homework due')}>
      <div className="widget-homework">
        {MOCK_HW.map((hw, i) => (
          <div key={i} className="hw-item">
            <span className="hw-color" style={{ background: hw.color }} />
            <div className="hw-info">
              <strong>{hw.title}</strong>
              <span className="text-muted">{hw.subject} — {t('dueDate', 'Due')}: {hw.due}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
