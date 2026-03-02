import { useEffect, useState } from 'react';
import { GraduationCap, AlertCircle } from 'lucide-react';
import { getDashboardStats, type DashboardStats } from '../../../api/dashboard';

export function ParentDashboard() {
  const [data, setData] = useState<DashboardStats | null>(null);

  useEffect(() => {
    getDashboardStats().then(r => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="animate-pulse p-8">Chargement...</div>;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Mes enfants</h2>
      {data.children?.length === 0 && (
        <p className="text-gray-500">Aucun enfant associé à votre compte.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {data.children?.map(child => (
          <div key={child.id} className="bg-white rounded-xl border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{child.name}</h3>
            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-green-600" />
                <span className="text-lg font-bold">{child.average}/20</span>
                <span className="text-sm text-gray-500">moyenne</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-lg font-bold">{child.absences}</span>
                <span className="text-sm text-gray-500">absences</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
