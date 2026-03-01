import { useTranslation } from 'react-i18next';
import { Card } from '../../../../components/ui/Card';

const MOCK_GRADES = [
  { subject: 'Mathematiques', title: 'Controle Ch.5', score: 16, max: 20, color: '#4A90D9' },
  { subject: 'Francais', title: 'Dissertation', score: 14, max: 20, color: '#E74C3C' },
  { subject: 'Anglais', title: 'Vocabulary test', score: 18, max: 20, color: '#9B59B6' },
  { subject: 'Histoire', title: 'Evaluation WW2', score: 12, max: 20, color: '#F39C12' },
  { subject: 'Sciences', title: 'TP Optique', score: 15, max: 20, color: '#27AE60' },
];

export function RecentGrades() {
  const { t } = useTranslation();

  return (
    <Card title={t('recentGrades', 'Recent grades')}>
      <div className="flex flex-col">
        {MOCK_GRADES.map((g, i) => (
          <div key={i} className="flex items-center gap-3 py-2 border-b border-border last:border-0 text-sm">
            <span className="w-1 h-8 rounded-sm shrink-0" style={{ background: g.color }} />
            <div className="flex flex-col flex-1 min-w-0">
              <strong>{g.subject}</strong>
              <span className="text-xs text-muted-foreground">{g.title}</span>
            </div>
            <span className="font-semibold shrink-0">{g.score}/{g.max}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
