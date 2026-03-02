import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLandingTheme } from '../../../hooks/useLandingTheme';
import { HubNavbar } from '../../../components/layout/HubNavbar';
import { HubFooter } from '../../../components/layout/HubFooter';
import { getCourses, Course } from '../../../api/catalog';
import { Search, Clock, ExternalLink, BookOpen } from 'lucide-react';

const DIFFICULTIES = ['', 'beginner', 'intermediate', 'advanced'];
const CATEGORIES = ['', 'academic', 'professional', 'skills'];
const LANGUAGES = ['', 'en', 'fr'];

export function CatalogPage() {
  const t = useLandingTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [freeOnly, setFreeOnly] = useState(false);

  const fetchCourses = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (search) params.search = search;
    if (difficulty) params.difficulty = difficulty;
    if (category) params.category = category;
    if (language) params.language = language;
    if (freeOnly) params.free_only = 'true';
    getCourses(params).then(r => setCourses(r.data)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCourses(); }, [difficulty, category, language, freeOnly]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchCourses(); };

  const diffLabel = (d: string) => ({ beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' }[d] || d);
  const formatLabel = (f: string) => ({ video: 'Video', text: 'Text', interactive: 'Interactive', project: 'Project', mixed: 'Mixed' }[f] || f);

  return (
    <div className={`min-h-screen ${t.bg}`}>
      <HubNavbar />
      <div className="pt-24 pb-16 px-4 max-w-6xl mx-auto">
        <h1 className={`text-3xl font-bold ${t.heading} mb-2`}>Course Catalog</h1>
        <p className={`${t.text} mb-6`}>{courses.length} free courses from top platforms</p>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search courses..."
                className="pl-9 pr-4 py-2 rounded-lg border border-gray-300 text-sm w-64" />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">Search</button>
          </form>
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="">All levels</option>
            {DIFFICULTIES.filter(Boolean).map(d => <option key={d} value={d}>{diffLabel(d)}</option>)}
          </select>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="">All categories</option>
            {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm">
            <option value="">All languages</option>
            <option value="en">English</option>
            <option value="fr">Francais</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={freeOnly} onChange={e => setFreeOnly(e.target.checked)} />
            Free only
          </label>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-400">Loading...</div>
        ) : courses.length === 0 ? (
          <div className="text-center py-20 text-gray-400">No courses found. Try different filters.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {courses.map(c => (
              <div key={c.id} className={`rounded-2xl border ${t.cardBorder} ${t.card} overflow-hidden transition hover:shadow-md`}>
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-medium ${t.accent}`}>{c.platform_name}</span>
                    <div className="flex gap-1.5">
                      {c.is_free && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Free</span>}
                      {c.has_certificate && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Cert</span>}
                    </div>
                  </div>
                  <h3 className={`text-base font-semibold ${t.heading} mb-2 line-clamp-2`}>{c.title}</h3>
                  <p className={`text-sm ${t.text} mb-3 line-clamp-2`}>{c.description}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="capitalize">{diffLabel(c.difficulty)}</span>
                    <span>{formatLabel(c.format)}</span>
                    <span className="uppercase">{c.language}</span>
                    {c.duration_hours && (
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.duration_hours}h</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {c.tags.slice(0, 4).map(tag => (
                      <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{tag}</span>
                    ))}
                  </div>
                  <a href={c.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                    Go to course <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <HubFooter />
    </div>
  );
}
