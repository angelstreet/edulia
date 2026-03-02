import { Link } from 'react-router-dom';
import { useLandingTheme } from '../../hooks/useLandingTheme';

export function HubFooter() {
  const t = useLandingTheme();

  return (
    <footer className={`${t.footer} ${t.footerText} py-16 px-4 sm:px-6 lg:px-8 border-t ${t.footerBorder}`}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/edulia-icon.png" alt="Edulia" className="w-7 h-7" />
              <span className="text-lg font-bold text-white">EduliaHub</span>
            </div>
            <p className="text-sm leading-relaxed">Your learning, organized. Browse, learn, prove, share.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/courses" className="hover:text-white transition">Courses</Link></li>
              <li><Link to="/platforms" className="hover:text-white transition">Platforms</Link></li>
              <li><Link to="/curriculum" className="hover:text-white transition">Curriculum</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">Build</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/certificates" className="hover:text-white transition">Certificates</Link></li>
              <li><Link to="/portfolio" className="hover:text-white transition">Portfolio</Link></li>
              <li><a href="https://edulia.angelstreet.io" className="hover:text-white transition">For Institutions</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="https://github.com/angelstreet/edulia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></li>
              <li><a href="#" className="hover:text-white transition">Privacy</a></li>
              <li><a href="#" className="hover:text-white transition">Terms</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm">&copy; {new Date().getFullYear()} Edulia. All rights reserved.</p>
          <p className="text-sm">Open source. Made in Europe.</p>
        </div>
      </div>
    </footer>
  );
}
