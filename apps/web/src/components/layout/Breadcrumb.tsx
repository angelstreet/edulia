import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Breadcrumb() {
  const location = useLocation();
  const { t } = useTranslation();

  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="flex items-center text-sm text-muted-foreground" aria-label="breadcrumb">
      <Link to="/" className="text-primary hover:underline">
        {t('home')}
      </Link>
      {segments.map((segment, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const isLast = idx === segments.length - 1;
        return (
          <span key={path} className="flex items-center">
            <span className="mx-1.5">/</span>
            {isLast ? (
              <span className="text-foreground">{segment}</span>
            ) : (
              <Link to={path} className="text-primary hover:underline">
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
