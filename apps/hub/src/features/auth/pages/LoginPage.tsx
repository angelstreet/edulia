import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { login as loginApi } from '../../../api/auth';
import { setAuth } from '../../../stores/authStore';

export function LoginPage() {
  const t = useLandingTheme();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await loginApi({ email, password });
      setAuth(data.access_token, { id: data.user.id, email: data.user.email, display_name: data.user.display_name, role: data.user.role });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center px-4 ${t.bg}`}>
      <div className={`w-full max-w-md ${t.card} rounded-2xl shadow-lg p-8 border ${t.cardBorder}`}>
        <div className="text-center mb-6">
          <img src="/edulia-logo.png" alt="EduliaHub" className="h-12 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${t.heading}`}>Log in to EduliaHub</h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="Email" required className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Password" required className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm" />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className={`w-full py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition ${loading ? 'opacity-50' : ''}`}>
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className={`mt-4 text-center text-sm ${t.textMuted}`}>
          No account? <Link to="/signup" className={`${t.accent} hover:underline`}>Sign up free</Link>
          {' | '}
          <Link to="/" className={`${t.accent} hover:underline`}>Home</Link>
        </p>
      </div>
    </div>
  );
}
