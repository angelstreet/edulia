import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertsWidget } from './widgets/AlertsWidget';
import { RecentGrades } from './widgets/RecentGrades';

const MOCK_CHILDREN = [
  { id: '1', name: 'Lucas Martin' },
  { id: '2', name: 'Emma Martin' },
];

export function ParentDashboard() {
  const { t } = useTranslation();
  const [selectedChild, setSelectedChild] = useState(MOCK_CHILDREN[0].id);

  return (
    <div className="dashboard-grid">
      <div className="child-selector-card card">
        <div className="card-body">
          <label className="form-group">
            <strong>{t('selectChild', 'Select child')}</strong>
            <select className="filter-select" value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)}>
              {MOCK_CHILDREN.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <AlertsWidget />
      <RecentGrades />
    </div>
  );
}
