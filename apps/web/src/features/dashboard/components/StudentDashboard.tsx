import { useEffect, useState } from 'react';
import { TrendingUp, FileText, AlertCircle } from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../../api/dashboard';

const ICONS: Record<string, React.ElementType> = {
  average: TrendingUp, pending_homework: FileText, absences: AlertCircle,
};

export function StudentDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="animate-pulse p-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Mon espace</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {data.stats?.map(s => {
          const Icon = ICONS[s.key] || TrendingUp;
          const color = s.key === 'absences' ? 'red' : s.key === 'average' ? 'green' : 'blue';
          return (
            <div key={s.key} className="bg-white rounded-xl border p-5 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-lg bg-${color}-50 flex items-center justify-center`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {s.key === 'average' ? `${s.value}/20` : s.value}
                </p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
