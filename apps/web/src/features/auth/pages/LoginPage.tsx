import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { useAuthStore } from '../../../stores/authStore';
import { School, BookOpen, Building, User, ChevronDown, ChevronUp } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    category: 'College Moliere',
    icon: School,
    accounts: [
      { label: 'Admin', email: 'admin@demo.edulia.io', role: 'Directrice' },
      { label: 'Enseignant', email: 'prof.martin@demo.edulia.io', role: 'Maths' },
      { label: 'Enseignant 2', email: 'prof.dubois@demo.edulia.io', role: 'Francais' },
      { label: 'Eleve', email: 'emma.leroy@demo.edulia.io', role: '6eA' },
      { label: 'Eleve 2', email: 'lucas.moreau@demo.edulia.io', role: '6eA' },
      { label: 'Parent', email: 'parent.leroy@demo.edulia.io', role: "Parent d'Emma" },
    ],
  },
  {
    category: 'TutorPro Lyon',
    icon: BookOpen,
    accounts: [
      { label: 'Tuteur', email: 'sophie@demo.edulia.io', role: 'Maths 6e' },
      { label: 'Eleve', email: 'julie.petit@demo.edulia.io', role: 'Groupe Maths' },
      { label: 'Parent', email: 'parent.petit@demo.edulia.io', role: 'Parent de Julie' },
    ],
  },
  {
    category: 'FormaTech SA',
    icon: Building,
    accounts: [
      { label: 'RH Admin', email: 'rh@demo.edulia.io', role: 'Direction RH' },
      { label: 'Employe', email: 'jean.dupont@demo.edulia.io', role: 'Collaborateur' },
    ],
  },
  {
    category: 'Cours Particuliers Rousseau',
    icon: User,
    accounts: [
      { label: 'Professeur', email: 'prof.rousseau@demo.edulia.io', role: 'Maths' },
      { label: 'Élève', email: 'leo.martin@demo.edulia.io', role: 'Léo Martin' },
      { label: 'Parent', email: 'parent.martin@demo.edulia.io', role: "Parent de Léo" },
    ],
  },
];

export function LoginPage() {
  
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: Location })?.from?.pathname || '/';
  const theme = useLandingTheme();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDemo, setShowDemo] = useState(true);

  const handleLogin = async (e?: React.FormEvent, demoEmail?: string) => {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(demoEmail || email, demoEmail ? 'demo2026' : password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center px-4 ${theme.bg}`}>
      <div className={`w-full max-w-md ${theme.card} rounded-2xl shadow-lg p-8 border ${theme.cardBorder}`}>
        <div className="text-center mb-8">
          <img src="/edulia-logo.png" alt="Edulia" className="h-12 mx-auto" />
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-1`}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="admin@ecole.fr"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.text} mb-1`}>Mot de passe</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className={`w-full py-2.5 rounded-lg font-medium text-white bg-blue-600 hover:bg-blue-700 transition ${loading ? 'opacity-50' : ''}`}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-6">
          <button onClick={() => setShowDemo(!showDemo)}
            className={`w-full flex items-center justify-center gap-2 text-sm ${theme.textMuted} hover:text-current transition`}>
            {showDemo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Comptes de demonstration
          </button>

          {showDemo && (
            <div className="mt-4 space-y-4">
              <p className={`text-xs text-center ${theme.textMuted}`}>
                Donnees reinitialises toutes les 10 min. Mot de passe: demo2026
              </p>
              {DEMO_ACCOUNTS.map(group => (
                <div key={group.category}>
                  <div className={`flex items-center gap-2 mb-2 ${theme.text}`}>
                    <group.icon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{group.category}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {group.accounts.map(acc => (
                      <button key={acc.email} onClick={() => handleLogin(undefined, acc.email)}
                        className={`text-left px-3 py-2 rounded-lg text-xs border ${theme.cardBorder} hover:bg-blue-50 hover:border-blue-200 transition`}>
                        <span className="font-medium text-gray-900">{acc.label}</span>
                        <br />
                        <span className="text-gray-500">{acc.role}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
