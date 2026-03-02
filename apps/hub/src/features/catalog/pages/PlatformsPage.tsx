import { useEffect, useState } from 'react';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';
import { getPlatforms, Platform } from '../../../api/catalog';
import { Globe, ExternalLink } from 'lucide-react';

export function PlatformsPage() {
  const t = useLandingTheme();
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPlatforms().then(r => setPlatforms(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <HubNavbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <h1 className={`text-3xl font-bold ${t.heading} mb-2`}>Learning Platforms</h1>
        <p className={`${t.text} mb-8`}>{platforms.length} platforms indexed</p>
        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {platforms.map(p => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                className={`p-6 rounded-2xl border ${t.cardBorder} ${t.card} ${t.cardHover} transition group block`}>
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-xl ${t.accentBg} flex items-center justify-center`}>
                    <Globe className={`w-5 h-5 ${t.iconAccent}`} />
                  </div>
                  <div className="flex gap-2">
                    {p.is_free && <span className={`text-xs px-2 py-0.5 rounded-full ${t.badge} ${t.badgeText}`}>Free</span>}
                    {p.has_certificates && <span className={`text-xs px-2 py-0.5 rounded-full ${t.badge} ${t.badgeText}`}>Certs</span>}
                  </div>
                </div>
                <h3 className={`text-lg font-semibold ${t.heading} mb-1`}>{p.name}</h3>
                <p className={`text-sm ${t.text} leading-relaxed mb-3`}>{p.description}</p>
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${t.textMuted}`}>{p.course_count} courses</span>
                  <ExternalLink className={`w-4 h-4 ${t.textMuted} group-hover:text-current transition`} />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
      <HubFooter />
    </div>
  );
}
