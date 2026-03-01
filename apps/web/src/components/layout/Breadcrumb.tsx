import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function Breadcrumb() {
  const location = useLocation();
  const { t } = useTranslation();

  const segments = location.pathname.split('/').filter(Boolean);

  return (
    <nav className="breadcrumb" aria-label="breadcrumb">
      <Link to="/" className="breadcrumb-link">
        {t('home')}
      </Link>
      {segments.map((segment, idx) => {
        const path = '/' + segments.slice(0, idx + 1).join('/');
        const isLast = idx === segments.length - 1;
        return (
          <span key={path}>
            <span className="breadcrumb-sep">/</span>
            {isLast ? (
              <span className="breadcrumb-current">{segment}</span>
            ) : (
              <Link to={path} className="breadcrumb-link">
                {segment}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
