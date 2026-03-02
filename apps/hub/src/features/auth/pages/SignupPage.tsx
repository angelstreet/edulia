import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { register } from '../../../api/auth';
import { setAuth } from '../../../stores/authStore';

export function SignupPage() {
  const t = useLandingTheme();
  const navigate = useNavigate();
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await register(form);
      setAuth(data.access_token, { id: data.user.id, email: data.user.email, display_name: data.user.display_name, role: data.user.role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${t.bg}`}>
      <div className={`w-full max-w-md ${t.card} rounded-2xl shadow-lg p-8 border ${t.cardBorder}`}>
        <div className="text-center mb-6">
          <img src="/edulia-logo.png" alt="EduliaHub" className="h-12 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${t.heading}`}>Create your free account</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
              placeholder="First name" required className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
            <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
              placeholder="Last name" required className="px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          </div>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            placeholder="Email" required className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            placeholder="Password" required minLength={6} className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className={`w-full py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition ${loading ? 'opacity-50' : ''}`}>
            {loading ? 'Creating...' : 'Sign up free'}
          </button>
        </form>
        <p className={`mt-4 text-center text-sm ${t.textMuted}`}>
          Already have an account? <Link to="/login" className={`${t.accent} hover:underline`}>Log in</Link>
        </p>
      </div>
    </div>
  );
}
