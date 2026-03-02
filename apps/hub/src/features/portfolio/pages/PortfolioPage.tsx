import { useEffect, useState } from 'react';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';
import { useAuth } from '../../../stores/authStore';
import { getMyPortfolio, updateMyPortfolio, type Portfolio } from '../../../api/portfolio';
import { getMyCertificates, type Certificate } from '../../../api/certificates';
import { User, Award, Link as LinkIcon, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PortfolioPage() {
  const t = useLandingTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ headline: '', bio: '', linkedin_url: '', website_url: '' });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    getMyPortfolio().then(r => {
      setPortfolio(r.data);
      setForm({ headline: r.data.headline || '', bio: r.data.bio || '', linkedin_url: r.data.linkedin_url || '', website_url: r.data.website_url || '' });
    });
    getMyCertificates().then(r => setCerts(r.data));
  }, [isAuthenticated]);

  const handleSave = async () => {
    const { data } = await updateMyPortfolio(form);
    setPortfolio(data);
    setEditing(false);
  };

  if (!portfolio) return <div className={`min-h-screen ${t.bg}`}><HubNavbar /><div className="pt-24 text-center">Loading...</div></div>;

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <HubNavbar />
      <div className="pt-24 pb-16 px-4 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${t.heading}`}>My Portfolio</h1>
          <div className="flex gap-2">
            <span className={`text-sm ${t.textMuted}`}>Public URL: /u/{portfolio.slug}</span>
            {!editing ? (
              <button onClick={() => setEditing(true)} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Edit</button>
            ) : (
              <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white text-sm rounded-lg">
                <Save className="w-4 h-4" /> Save
              </button>
            )}
          </div>
        </div>

        <div className={`p-8 rounded-2xl border ${t.cardBorder} ${t.card} mb-6`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-16 h-16 rounded-full ${t.accentBg} flex items-center justify-center`}>
              <User className={`w-8 h-8 ${t.iconAccent}`} />
            </div>
            <div className="flex-1">
              <h2 className={`text-xl font-bold ${t.heading}`}>{portfolio.user_name}</h2>
              {editing ? (
                <input value={form.headline} onChange={e => setForm(f => ({ ...f, headline: e.target.value }))}
                  placeholder="Your headline (e.g. Cloud Engineer | AWS Certified)"
                  className="w-full mt-1 px-3 py-1.5 rounded-lg border border-gray-300 text-sm" />
              ) : (
                <p className={`${t.text}`}>{portfolio.headline || 'No headline set'}</p>
              )}
            </div>
          </div>
          {editing ? (
            <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm h-24" />
          ) : (
            <p className={`${t.text} text-sm`}>{portfolio.bio || 'No bio yet.'}</p>
          )}
          {editing && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input value={form.linkedin_url} onChange={e => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="LinkedIn URL" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <input value={form.website_url} onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                placeholder="Website URL" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
          )}
        </div>

        <h3 className={`text-lg font-semibold ${t.heading} mb-4`}>
          <Award className="inline w-5 h-5 mr-1" /> Certificates ({certs.length})
        </h3>
        {certs.length === 0 ? (
          <p className={`${t.textMuted} text-sm`}>No certificates yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {certs.map(c => (
              <div key={c.id} className={`p-4 rounded-xl border ${t.cardBorder} ${t.card}`}>
                <h4 className={`font-medium ${t.heading}`}>{c.title}</h4>
                <p className={`text-sm ${t.textMuted}`}>{c.issuer} {c.issued_date ? `- ${c.issued_date}` : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <HubFooter />
    </div>
  );
}
