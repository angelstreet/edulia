import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { getDashboardStats } from '../../../api/dashboard';
import { GraduationCap, AlertCircle, BookOpen, ClipboardCheck, Calendar, ChevronRight, Map } from 'lucide-react';

interface Child {
  id: string;
  name: string;
  average: number;
  absences: number;
}

function getAverageColor(avg: number) {
  if (avg >= 15) return 'text-green-600';
  if (avg >= 10) return 'text-yellow-600';
  return 'text-red-500';
}

function getAbsenceColor(n: number) {
  if (n === 0) return 'text-green-600';
  if (n <= 3) return 'text-yellow-600';
  return 'text-red-500';
}

function getInitials(name: string) {
  return name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
}

export function ChildrenPage() {
  const { t } = useTranslation();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboardStats()
      .then(({ data }) => setChildren(data.children ?? []))
      .catch(() => setChildren([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('children', 'My Children')}</h1>

      {children.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-4xl mb-3">👨‍👩‍👧</p>
          <p className="font-medium">{t('noChildrenLinked', 'No children linked to your account.')}</p>
          <p className="text-sm mt-1">{t('noChildrenHint', 'Contact the school administration to link your children.')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {children.map((child) => (
            <div key={child.id} className="border rounded-2xl bg-card overflow-hidden shadow-sm">
              {/* Header */}
              <div className="bg-slate-800 text-white px-6 py-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold shrink-0">
                  {getInitials(child.name)}
                </div>
                <div>
                  <h2 className="text-lg font-semibold">{child.name}</h2>
                </div>
              </div>

              {/* Stats */}
              <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('average', 'Average')}</p>
                    <p className={`text-xl font-bold ${getAverageColor(child.average)}`}>
                      {child.average > 0 ? `${child.average}/20` : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('absences', 'Absences')}</p>
                    <p className={`text-xl font-bold ${getAbsenceColor(child.absences)}`}>
                      {child.absences}
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick links */}
              <div className="px-6 py-3 flex flex-col gap-0.5">
                <Link
                  to="/grades"
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <GraduationCap className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    {t('grades', 'Grades & Report Card')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  to="/homework"
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    {t('homework', 'Homework')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  to="/timetable"
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <Calendar className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    {t('timetable', 'Timetable')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  to="/school-life"
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <ClipboardCheck className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    {t('schoolLife', 'School Life')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
                <Link
                  to={`/children/${child.id}/programme`}
                  className="flex items-center justify-between py-2.5 text-sm hover:text-primary transition-colors group"
                >
                  <span className="flex items-center gap-2.5">
                    <Map className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                    {t('programme', 'Programme scolaire')}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
