import { Link } from 'react-router-dom';
import { useLandingTheme } from '../../hooks/useLandingTheme';
import { ThemeSwitcher } from '../common/ThemeSwitcher';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { useAuth, clearAuth } from '../../stores/authStore';

export function HubNavbar() {
  const t = useLandingTheme();
  const { user, isAuthenticated } = useAuth();

  return (
    <nav className={`fixed top-0 w-full ${t.nav} backdrop-blur-md border-b ${t.navBorder} z-40 transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src="/edulia-logo.png" alt="EduliaHub" className="h-9" />
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link to="/courses" className={`text-sm ${t.textMuted} hover:text-current transition`}>Courses</Link>
          <Link to="/platforms" className={`text-sm ${t.textMuted} hover:text-current transition`}>Platforms</Link>
          <Link to="/curriculum" className={`text-sm ${t.textMuted} hover:text-current transition`}>Curriculum</Link>
          <a href="https://edulia.angelstreet.io" className={`text-sm ${t.textMuted} hover:text-current transition`}>
            For Institutions &#8599;
          </a>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher className={t.textMuted} />
          <ThemeSwitcher inline />
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className={`text-sm font-medium ${t.text}`}>Dashboard</Link>
              <button onClick={clearAuth} className={`text-sm ${t.textMuted} hover:text-current`}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className={`text-sm font-medium ${t.text} transition`}>Log in</Link>
              <Link to="/signup" className={`text-sm font-medium ${t.primary} ${t.primaryHover} ${t.primaryText} px-4 py-2 rounded-lg transition`}>Sign up free</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
