import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  BarChart3,
  MessageSquare,
  FileText,
  CreditCard,
  ClipboardCheck,
  Users,
  BookOpen,
  Settings,
  GraduationCap,
  Building2,
  Briefcase,
  ArrowRight,
  CheckCircle2,
  Globe,
  Shield,
  Zap,
} from 'lucide-react';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { ThemeSwitcher } from '../../../components/common/ThemeSwitcher';
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher';

export function LandingPage() {
  const t = useLandingTheme();
  return (
    <div className={`min-h-screen ${t.bg} transition-colors duration-300`}>

      {/* Nav */}
      <nav className={`fixed top-0 w-full ${t.nav} backdrop-blur-md border-b ${t.navBorder} z-40 transition-colors duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to="/landing" className="flex items-center">
            <img src="/edulia-logo.png" alt="Edulia" className="h-9" />
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <NavDropdown label="For Schools" t={t} items={['Timetable', 'Attendance', 'Gradebook', 'Report cards', 'Enrollment']} />
            <NavDropdown label="For Tutors" t={t} items={['Booking', 'Learning plans', 'Hour packages', 'Progress notes']} />
            <NavDropdown label="For Enterprises" t={t} items={['Course catalog', 'Certifications', 'Learning paths', 'Budget tracking']} />
            <NavDropdown label="For Learners" t={t} items={['My courses', 'My grades', 'My schedule', 'My documents']} />
            <a href="http://192.168.0.120:3004" className={`text-sm whitespace-nowrap ${t.accent} hover:text-current transition font-medium`}>
              EduliaHub &#8599;
            </a>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher className={t.textMuted} />
            <ThemeSwitcher inline />
            <Link to="/login" className={`text-sm font-medium ${t.text} transition`}>Log in</Link>
            <Link to="/login" className={`text-sm font-medium ${t.primary} ${t.primaryHover} ${t.primaryText} px-4 py-2 rounded-lg transition`}>Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative">
          <div className={`inline-flex items-center gap-2 ${t.badge} ${t.badgeText} text-sm font-medium px-4 py-1.5 rounded-full mb-6 border ${t.badgeBorder}`}>
            <Zap className="w-4 h-4" />
            Open-source learning platform
          </div>
          <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-bold ${t.heading} leading-tight tracking-tight transition-colors duration-300`}>
            Teach better.
            <br />
            <span className={t.accent}>Learn faster.</span>
          </h1>
          <p className={`mt-6 text-xl ${t.text} max-w-2xl mx-auto leading-relaxed`}>
            Everything that connects those who teach with those who learn
            &mdash; scheduling, grading, messaging, payments &mdash; in one
            modular platform.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login" className={`inline-flex items-center justify-center gap-2 ${t.primary} ${t.primaryHover} ${t.primaryText} font-semibold px-8 py-3.5 rounded-xl transition shadow-lg`}>
              Start for free <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="#features" className={`inline-flex items-center justify-center gap-2 ${t.outlineBtnText} font-semibold px-8 py-3.5 rounded-xl border ${t.outlineBtn} transition`}>
              See features
            </a>
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className={`py-8 border-y ${t.trustBorder} ${t.trustBg} transition-colors duration-300`}>
        <div className={`max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-center gap-8 text-sm ${t.textMuted}`}>
          {[
            { icon: Shield, label: 'GDPR compliant' },
            { icon: Globe, label: 'Hosted in Europe' },
            { icon: BookOpen, label: 'Open source (AGPL-3.0)' },
            { icon: Zap, label: 'Self-hostable' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${t.iconAccent}`} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features grid */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold ${t.heading}`}>Everything you need to run a learning institution</h2>
            <p className={`mt-4 text-lg ${t.text} max-w-2xl mx-auto`}>Enable only the modules you need. Add more as you grow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Calendar, title: 'Timetable', desc: 'Weekly schedules, room booking, substitutions. Recurring or one-off sessions.' },
              { icon: ClipboardCheck, title: 'Attendance', desc: 'Roll call per session, justifications, parent alerts. Track absences and tardiness.' },
              { icon: BarChart3, title: 'Gradebook', desc: 'Grade entry, averages, coefficients. Numeric, qualitative, or competency-based.' },
              { icon: FileText, title: 'Homework', desc: 'Content diary, assignments with due dates, file attachments, online submission.' },
              { icon: MessageSquare, title: 'Messaging', desc: 'Threaded conversations between teachers, parents, and staff. Real-time notifications.' },
              { icon: CreditCard, title: 'Billing', desc: 'Invoices, online payment, prepaid wallets. Annual tuition or hourly packages.' },
              { icon: Users, title: 'Users & Roles', desc: 'Teachers, students, parents, staff. Fine-grained permissions per role.' },
              { icon: Settings, title: 'Modular by design', desc: 'Toggle features on or off. Your workspace, your rules. No bloat.' },
              { icon: Globe, title: 'Multilingual', desc: 'French and English built-in. Add any language with i18n support.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className={`p-6 rounded-2xl border ${t.cardBorder} ${t.cardHover} ${t.card} transition group`}>
                <div className={`w-10 h-10 rounded-xl ${t.accentBg} flex items-center justify-center mb-4 transition`}>
                  <Icon className={`w-5 h-5 ${t.iconAccent}`} />
                </div>
                <h3 className={`text-lg font-semibold ${t.heading} mb-2`}>{title}</h3>
                <p className={`text-sm ${t.text} leading-relaxed`}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Audiences */}
      <section id="audiences" className={`py-24 px-4 sm:px-6 lg:px-8 ${t.bgAlt} transition-colors duration-300`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className={`text-3xl sm:text-4xl font-bold ${t.heading}`}>One platform, configured for you</h2>
            <p className={`mt-4 text-lg ${t.text} max-w-2xl mx-auto`}>Same core. Different presets. Choose your starting point &mdash; customize everything after.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: GraduationCap, title: 'Schools', desc: 'Timetable, attendance, grades, report cards, homework, school life. Replace Ecole Directe or Pronote.', modules: ['Timetable', 'Attendance', 'Gradebook', 'Report cards', 'School life', 'Enrollment'], colors: t.audienceGreen },
              { icon: Building2, title: 'Tutoring Centers', desc: 'Booking, individual learning plans, hour packages, progress tracking. Run your center efficiently.', modules: ['Booking', 'Learning plans', 'Hour packages', 'Progress notes', 'Billing'], colors: t.audienceTeal },
              { icon: Briefcase, title: 'Enterprise', desc: 'Course catalog, learning paths, certifications, budget allocation. Train your teams.', modules: ['Course catalog', 'Certifications', 'Learning paths', 'Budget tracking', 'Compliance'], colors: t.audienceBlue },
            ].map(({ icon: Icon, title, desc, modules, colors }) => (
              <div key={title} className={`p-8 rounded-2xl border ${t.card} transition ${colors.border}`}>
                <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center mb-5`}>
                  <Icon className={`w-6 h-6 ${colors.icon}`} />
                </div>
                <h3 className={`text-xl font-bold ${t.heading} mb-3`}>{title}</h3>
                <p className={`text-sm ${t.text} leading-relaxed mb-6`}>{desc}</p>
                <ul className="space-y-2">
                  {modules.map((m) => (
                    <li key={m} className={`flex items-center gap-2 text-sm ${t.text}`}>
                      <CheckCircle2 className={`w-4 h-4 ${colors.check} shrink-0`} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open source */}
      <section id="open-source" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold ${t.heading}`}>Open source. No lock-in.</h2>
          <p className={`mt-6 text-lg ${t.text} leading-relaxed`}>
            Edulia is AGPL-3.0 licensed. Schools can self-host for free. Your data stays yours &mdash; no vendor lock-in, no surprise pricing. Built with React, FastAPI, PostgreSQL, and Redis.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://github.com/angelstreet/edulia" target="_blank" rel="noopener noreferrer"
              className={`inline-flex items-center justify-center gap-2 ${t.githubBtnText + ' ' + t.githubBtn} font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition`}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
              View on GitHub
            </a>
            <Link to="/login" className={`inline-flex items-center justify-center gap-2 ${t.primary} ${t.primaryHover} ${t.primaryText} font-semibold px-8 py-3.5 rounded-xl transition`}>
              Try the demo <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 ${t.ctaBg}`}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className={`text-3xl sm:text-4xl font-bold ${t.ctaText}`}>Ready to modernize your institution?</h2>
          <p className={`mt-4 text-lg ${t.ctaText} opacity-80`}>Start free. No credit card. Deploy in minutes.</p>
          <div className="mt-8">
            <Link to="/login" className={`inline-flex items-center justify-center gap-2 ${t.ctaBtn} ${t.ctaBtnText} font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition shadow-lg`}>
              Get started now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`${t.footer} ${t.footerText} py-16 px-4 sm:px-6 lg:px-8 border-t ${t.footerBorder}`}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <img src="/edulia-icon.png" alt="Edulia" className="w-7 h-7" />
                <span className="text-lg font-bold text-white">Edulia</span>
              </div>
              <p className="text-sm leading-relaxed">The open-source platform for teaching and learning.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white transition">Features</a></li>
                <li><a href="#audiences" className="hover:text-white transition">Solutions</a></li>
                <li><a href="#" className="hover:text-white transition">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/angelstreet/edulia" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">GitHub</a></li>
                <li><a href="#" className="hover:text-white transition">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition">GDPR</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">&copy; {new Date().getFullYear()} Edulia. All rights reserved.</p>
            <p className="text-sm">Made with care in Europe.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavDropdown({ label, t: th, items }: { label: string; t: ReturnType<typeof import('../../../hooks/useLandingTheme').useLandingTheme>; items: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button className={`text-sm whitespace-nowrap ${th.textMuted} hover:text-current transition flex items-center gap-1`}>
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className={`absolute top-full left-0 mt-2 w-52 ${th.card} border ${th.cardBorder} rounded-xl shadow-xl p-2 z-50`}>
          {items.map((item) => (
            <a key={item} href="#features" className={`block px-3 py-2 text-sm ${th.text} hover:${th.accentBg} rounded-lg transition`}>
              {item}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
