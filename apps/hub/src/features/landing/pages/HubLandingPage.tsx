import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Award,
  Share2,
  Search,
  Globe,
  Shield,
  Zap,
  Star,
  GraduationCap,
  Briefcase,
  TrendingUp,
} from 'lucide-react';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';

const PLATFORMS = [
  'Khan Academy', 'Coursera', 'AWS', 'Microsoft Learn',
  'NVIDIA', 'freeCodeCamp', 'OpenClassrooms', 'Google',
];

export function HubLandingPage() {
  const t = useLandingTheme();

  return (
    <div className={`min-h-screen ${t.bg} transition-colors duration-300`}>
      <HubNavbar />

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className={`inline-flex items-center gap-2 ${t.badge} ${t.badgeText} text-sm font-medium px-4 py-1.5 rounded-full mb-6 border ${t.badgeBorder}`}>
            <Zap className="w-4 h-4" />
            Free &amp; open-source
          </div>
          <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold ${t.heading} leading-tight tracking-tight`}>
            Your learning,
            <br />
            <span className={t.accent}>organized.</span>
          </h1>
          <p className={`mt-6 text-xl ${t.text} max-w-2xl mx-auto leading-relaxed`}>
            Browse free courses from the best platforms. Collect certificates.
            Build your portfolio. Show the world what you know.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/courses" className={`inline-flex items-center justify-center gap-2 ${t.primary} ${t.primaryHover} ${t.primaryText} font-semibold px-8 py-3.5 rounded-xl transition shadow-lg`}>
              Browse courses <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/signup" className={`inline-flex items-center justify-center gap-2 ${t.outlineBtnText} font-semibold px-8 py-3.5 rounded-xl border ${t.outlineBtn} transition`}>
              Create free account
            </Link>
          </div>
        </div>
      </section>

      {/* Platform logos */}
      <section className={`py-8 border-y ${t.trustBorder} ${t.trustBg}`}>
        <div className={`max-w-5xl mx-auto px-4 text-center`}>
          <p className={`text-sm ${t.textMuted} mb-4`}>Courses from leading platforms</p>
          <div className="flex flex-wrap items-center justify-center gap-6">
            {PLATFORMS.map(name => (
              <span key={name} className={`text-sm font-medium ${t.text} opacity-60`}>{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold ${t.heading}`}>How it works</h2>
            <p className={`mt-4 text-lg ${t.text}`}>Four steps to a stronger profile</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              { icon: Search, step: '1', title: 'Browse', desc: 'Explore free courses from top platforms, filtered by skill, format, and career path.' },
              { icon: BookOpen, step: '2', title: 'Learn', desc: 'Take courses on the provider\'s site. Videos, quizzes, projects — your choice.' },
              { icon: Award, step: '3', title: 'Prove', desc: 'Upload your certificates and badges. We store them, map them to skills.' },
              { icon: Share2, step: '4', title: 'Share', desc: 'Build a public portfolio. Share on LinkedIn with one click.' },
            ].map(({ icon: Icon, step, title, desc }) => (
              <div key={step} className="text-center">
                <div className={`w-14 h-14 rounded-2xl ${t.accentBg} flex items-center justify-center mx-auto mb-4`}>
                  <Icon className={`w-6 h-6 ${t.iconAccent}`} />
                </div>
                <div className={`text-xs font-bold ${t.accent} mb-1`}>STEP {step}</div>
                <h3 className={`text-lg font-semibold ${t.heading} mb-2`}>{title}</h3>
                <p className={`text-sm ${t.text} leading-relaxed`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured categories */}
      <section className={`py-24 px-4 sm:px-6 lg:px-8 ${t.bgAlt}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold ${t.heading}`}>Learn with purpose</h2>
            <p className={`mt-4 text-lg ${t.text}`}>Every course maps to skills and career opportunities</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: GraduationCap, title: 'Academic', desc: 'Aligned with national curriculum. Math, science, languages — from primary to university.', tags: ['Khan Academy', 'FUN-MOOC', 'edX'] },
              { icon: Briefcase, title: 'Professional', desc: 'Cloud, AI, cybersecurity, business. Industry certifications that employers recognize.', tags: ['AWS', 'Microsoft', 'Google'] },
              { icon: TrendingUp, title: 'Skills', desc: 'Soft skills, creative, languages. Build a well-rounded profile for any career.', tags: ['Coursera', 'LinkedIn', 'Duolingo'] },
            ].map(({ icon: Icon, title, desc, tags }) => (
              <div key={title} className={`p-8 rounded-2xl border ${t.cardBorder} ${t.card} ${t.cardHover} transition`}>
                <div className={`w-12 h-12 rounded-xl ${t.accentBg} flex items-center justify-center mb-5`}>
                  <Icon className={`w-6 h-6 ${t.iconAccent}`} />
                </div>
                <h3 className={`text-xl font-bold ${t.heading} mb-3`}>{title}</h3>
                <p className={`text-sm ${t.text} leading-relaxed mb-4`}>{desc}</p>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
                    <span key={tag} className={`text-xs px-2 py-1 rounded-full ${t.badge} ${t.badgeText}`}>{tag}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / social proof */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '15+', label: 'Platforms' },
              { value: '500+', label: 'Free courses' },
              { value: '100%', label: 'Free to use' },
              { value: 'AGPL', label: 'Open source' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className={`text-3xl font-bold ${t.accent}`}>{value}</div>
                <div className={`text-sm ${t.textMuted} mt-1`}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${t.ctaBg}`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold ${t.ctaText}`}>Start building your learning portfolio</h2>
          <p className={`mt-4 text-lg ${t.ctaText} opacity-80`}>Free forever. No credit card. Your data stays yours.</p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup" className={`inline-flex items-center justify-center gap-2 ${t.ctaBtn} ${t.ctaBtnText} font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition shadow-lg`}>
              Sign up free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/courses" className="inline-flex items-center justify-center gap-2 text-white/90 font-semibold px-8 py-3.5 rounded-xl border border-white/30 hover:bg-white/10 transition">
              Browse courses
            </Link>
          </div>
        </div>
      </section>

      <HubFooter />
    </div>
  );
}
