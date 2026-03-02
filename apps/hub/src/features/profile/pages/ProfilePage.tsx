import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';

export function ProfilePage() {
  const t = useLandingTheme();
  return (
    <div className={`min-h-screen ${t.bg}`}>
      <HubNavbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <h1 className={`text-3xl font-bold ${t.heading}`}>Profile</h1>
        <p className={`mt-4 ${t.text}`}>Coming soon.</p>
      </div>
      <HubFooter />
    </div>
  );
}
