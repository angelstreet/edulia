import { useEffect, useState } from 'react';
import { BookOpen, Users, Clock, FileCheck } from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../../api/dashboard';

const ICONS: Record<string, React.ElementType> = {
  classes: BookOpen, students: Users, sessions_today: Clock, pending_submissions: FileCheck,
};

export function TeacherDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="animate-pulse p-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Tableau de bord enseignant</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.stats?.map(s => {
          const Icon = ICONS[s.key] || BookOpen;
          return (
            <div key={s.key} className="bg-white rounded-xl border p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
