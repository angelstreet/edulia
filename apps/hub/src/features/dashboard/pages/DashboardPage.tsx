import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';
import { useAuth } from '../../../stores/authStore';
import { getMyCertificates, Certificate } from '../../../api/certificates';
import { getMyPortfolio, Portfolio } from '../../../api/portfolio';
import { Award, User, BookOpen, ArrowRight } from 'lucide-react';

export function DashboardPage() {
  const t = useLandingTheme();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    getMyCertificates().then(r => setCerts(r.data)).catch(() => {});
    getMyPortfolio().then(r => setPortfolio(r.data)).catch(() => {});
  }, [isAuthenticated]);

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <HubNavbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <h1 className={`text-3xl font-bold ${t.heading} mb-2`}>
          Welcome, {user?.display_name || 'Learner'}
        </h1>
        <p className={`${t.text} mb-8`}>Your learning dashboard</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className={`p-6 rounded-2xl border ${t.cardBorder} ${t.card}`}>
            <Award className={`w-8 h-8 ${t.iconAccent} mb-3`} />
            <p className={`text-3xl font-bold ${t.heading}`}>{certs.length}</p>
            <p className={`text-sm ${t.textMuted}`}>Certificates</p>
          </div>
          <div className={`p-6 rounded-2xl border ${t.cardBorder} ${t.card}`}>
            <User className={`w-8 h-8 ${t.iconAccent} mb-3`} />
            <p className={`text-3xl font-bold ${t.heading}`}>{portfolio?.is_public ? 'Public' : 'Private'}</p>
            <p className={`text-sm ${t.textMuted}`}>Portfolio</p>
          </div>
          <div className={`p-6 rounded-2xl border ${t.cardBorder} ${t.card}`}>
            <BookOpen className={`w-8 h-8 ${t.iconAccent} mb-3`} />
            <p className={`text-3xl font-bold ${t.heading}`}>31+</p>
            <p className={`text-sm ${t.textMuted}`}>Courses available</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Link to="/certificates" className={`p-5 rounded-xl border ${t.cardBorder} ${t.card} ${t.cardHover} flex items-center justify-between group`}>
            <div>
              <h3 className={`font-semibold ${t.heading}`}>My Certificates</h3>
              <p className={`text-sm ${t.textMuted}`}>{certs.length} certificates uploaded</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </Link>
          <Link to="/portfolio" className={`p-5 rounded-xl border ${t.cardBorder} ${t.card} ${t.cardHover} flex items-center justify-between group`}>
            <div>
              <h3 className={`font-semibold ${t.heading}`}>My Portfolio</h3>
              <p className={`text-sm ${t.textMuted}`}>{portfolio?.slug ? `/u/${portfolio.slug}` : 'Not set up'}</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </Link>
          <Link to="/courses" className={`p-5 rounded-xl border ${t.cardBorder} ${t.card} ${t.cardHover} flex items-center justify-between group`}>
            <div>
              <h3 className={`font-semibold ${t.heading}`}>Browse Courses</h3>
              <p className={`text-sm ${t.textMuted}`}>Find your next learning opportunity</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </Link>
          <Link to="/platforms" className={`p-5 rounded-xl border ${t.cardBorder} ${t.card} ${t.cardHover} flex items-center justify-between group`}>
            <div>
              <h3 className={`font-semibold ${t.heading}`}>Platforms</h3>
              <p className={`text-sm ${t.textMuted}`}>Discover learning providers</p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition" />
          </Link>
        </div>
      </div>
      <HubFooter />
    </div>
  );
}
