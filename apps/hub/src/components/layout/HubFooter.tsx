import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLandingTheme } from '../../hooks/useLandingTheme';

export function HubFooter() {
  const t = useLandingTheme();
  const { t: tr } = useTranslation();

  return (
    <footer className={`${t.footer} ${t.footerText} py-16 px-4 sm:px-6 lg:px-8 border-t ${t.footerBorder}`}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/edulia-icon.png" alt="Edulia" className="w-7 h-7" />
              <span className="text-lg font-bold text-white">EduliaHub</span>
            </div>
            <p className="text-sm leading-relaxed">{tr('landing.footerTagline')}</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{tr('landing.footerLearn')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses" className="hover:text-white transition">{tr('landing.footerCourses')}</Link></li>
              <li><Link to="/platforms" className="hover:text-white transition">{tr('landing.footerPlatforms')}</Link></li>
              <li><Link to="/curriculum" className="hover:text-white transition">{tr('landing.footerCurriculum')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{tr('landing.footerBuild')}</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/certificates" className="hover:text-white transition">{tr('landing.footerCertificates')}</Link></li>
              <li><Link to="/portfolio" className="hover:text-white transition">{tr('landing.footerPortfolio')}</Link></li>
              <li><a href="https://edulia.angelstreet.io" className="hover:text-white transition">{tr('landing.footerForInstitutions')}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">{tr('landing.footerAbout')}</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://github.com/angelstreet/edulia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></li>
              <li><a href="#" className="hover:text-white transition">{tr('landing.footerPrivacy')}</a></li>
              <li><a href="#" className="hover:text-white transition">{tr('landing.footerTerms')}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">&copy; {new Date().getFullYear()} Edulia. {tr('landing.footerRights')}</p>
          <p className="text-sm">{tr('landing.footerMadeIn')}</p>
        </div>
      </div>
    </footer>
  );
}
