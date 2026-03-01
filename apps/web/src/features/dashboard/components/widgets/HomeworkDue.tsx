import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

const MOCK_HW = [
  { subject: 'Mathematiques', title: 'Exercices p.142', due: '2026-03-03', color: '#4A90D9' },
  { subject: 'Francais', title: 'Lire chapitre 8', due: '2026-03-04', color: '#E74C3C' },
  { subject: 'Anglais', title: 'Essay: My City', due: '2026-03-05', color: '#9B59B6' },
];

export function HomeworkDue() {
  const { t } = useTranslation();

  return (
    <Card title={t('homeworkDue', 'Homework due')}>
      <div className="flex flex-col">
        {MOCK_HW.map((hw, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-sm">
            <span className="w-1 h-8 rounded-sm shrink-0" style={{ background: hw.color }} />
            <div className="flex flex-col">
              <strong>{hw.title}</strong>
              <span className="text-xs text-muted-foreground">{hw.subject} -- {t('dueDate', 'Due')}: {hw.due}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
