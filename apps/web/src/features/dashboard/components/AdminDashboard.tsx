import { useEffect, useState } from 'react';
import { Users, GraduationCap, BookOpen, School } from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../../api/dashboard';

const ICONS: Record<string, React.ElementType> = {
  teachers: Users, students: GraduationCap, parents: Users, classes: School,
};

export function AdminDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="animate-pulse p-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Tableau de bord</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.stats?.map(s => {
          const Icon = ICONS[s.key] || BookOpen;
          return (
            <div key={s.key} className="bg-white rounded-xl border p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-sm text-gray-500">{s.label}</p>
              </div>
            </div>
          );
        })}
      </div>
      {data.attendance_today && (
        <div className="bg-white rounded-xl border p-5">
          <h3 className="font-medium text-gray-700 mb-2">Présences aujourd'hui</h3>
          <div className="flex gap-6">
            <span className="text-green-600 font-semibold">{data.attendance_today.present} présents</span>
            <span className="text-red-500 font-semibold">{data.attendance_today.absent} absents/retards</span>
          </div>
        </div>
      )}
    </div>
  );
}
