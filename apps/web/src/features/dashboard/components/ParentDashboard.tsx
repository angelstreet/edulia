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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <label className="flex flex-col gap-1">
          <strong className="text-sm">{t('selectChild', 'Select child')}</strong>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
            value={selectedChild}
            onChange={(e) => setSelectedChild(e.target.value)}
          >
            {MOCK_CHILDREN.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>
      </div>
      <AlertsWidget />
      <RecentGrades />
    </div>
  );
}
