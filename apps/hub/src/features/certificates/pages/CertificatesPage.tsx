import { useEffect, useState } from 'react';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';
import { useAuth } from '../../../stores/authStore';
import { getMyCertificates, createCertificate, deleteCertificate, Certificate } from '../../../api/certificates';
import { Award, Plus, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function CertificatesPage() {
  const t = useLandingTheme();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', issuer: '', issued_date: '', credential_id: '', verification_url: '', skills: '' });

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    getMyCertificates().then(r => setCerts(r.data)).catch(() => {});
  }, [isAuthenticated]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await createCertificate(form);
    setCerts([data, ...certs]);
    setShowForm(false);
    setForm({ title: '', issuer: '', issued_date: '', credential_id: '', verification_url: '', skills: '' });
  };

  const handleDelete = async (id: string) => {
    await deleteCertificate(id);
    setCerts(certs.filter(c => c.id !== id));
  };

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <HubNavbar />
      <div className="pt-24 pb-16 px-4 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className={`text-3xl font-bold ${t.heading}`}>My Certificates</h1>
          <button onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Add certificate
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className={`mb-6 p-6 rounded-xl border ${t.cardBorder} ${t.card} space-y-3`}>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Certificate title *" required className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <input value={form.issuer} onChange={e => setForm(f => ({ ...f, issuer: e.target.value }))}
                placeholder="Issuer (e.g. AWS, Coursera) *" required className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="date" value={form.issued_date} onChange={e => setForm(f => ({ ...f, issued_date: e.target.value }))}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <input value={form.credential_id} onChange={e => setForm(f => ({ ...f, credential_id: e.target.value }))}
                placeholder="Credential ID" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
              <input value={form.verification_url} onChange={e => setForm(f => ({ ...f, verification_url: e.target.value }))}
                placeholder="Verification URL" className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            </div>
            <input value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))}
              placeholder="Skills (comma-separated: python, aws, cloud)" className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancel</button>
            </div>
          </form>
        )}

        {certs.length === 0 ? (
          <div className="text-center py-20">
            <Award className={`w-12 h-12 mx-auto mb-4 ${t.textMuted}`} />
            <p className={t.text}>No certificates yet. Complete a course and add your first certificate.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {certs.map(c => (
              <div key={c.id} className={`p-5 rounded-xl border ${t.cardBorder} ${t.card}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className={`font-semibold ${t.heading}`}>{c.title}</h3>
                    <p className={`text-sm ${t.textMuted}`}>{c.issuer}</p>
                    {c.issued_date && <p className={`text-xs ${t.textMuted} mt-1`}>Issued: {c.issued_date}</p>}
                    {c.skills && <p className="text-xs text-blue-600 mt-1">{c.skills}</p>}
                  </div>
                  <div className="flex gap-2">
                    {c.verification_url && (
                      <a href={c.verification_url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <HubFooter />
    </div>
  );
}
