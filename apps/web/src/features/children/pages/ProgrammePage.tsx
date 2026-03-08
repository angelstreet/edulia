import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Spinner } from '../../../components/ui/Spinner';
import { getStudentProgramme, type StudentProgramme, type CurriculumDomain } from '../../../api/curriculum';
import { ChevronDown, ChevronRight, BookOpen, ExternalLink, Calendar, School, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const DOMAIN_COLORS: Record<string, string> = {
  LANGAGE:    'bg-purple-100 text-purple-800 border-purple-200',
  PHYSIQUE:   'bg-green-100 text-green-800 border-green-200',
  ARTISTIQUE: 'bg-pink-100 text-pink-800 border-pink-200',
  MATHS:      'bg-blue-100 text-blue-800 border-blue-200',
  MONDE:      'bg-amber-100 text-amber-800 border-amber-200',
};

const DOMAIN_DOT: Record<string, string> = {
  LANGAGE:    'bg-purple-500',
  PHYSIQUE:   'bg-green-500',
  ARTISTIQUE: 'bg-pink-500',
  MATHS:      'bg-blue-500',
  MONDE:      'bg-amber-500',
};

function CompetencyRow({ comp }: { comp: ReturnType<typeof flattenComp> }) {
  const [open, setOpen] = useState(false);
  const hasSchoolPlan = !!comp.school_plan;
  const hasContent = (comp.school_plan?.content?.length ?? 0) > 0;

  return (
    <div className={cn('border rounded-lg overflow-hidden', hasSchoolPlan ? 'border-blue-200' : 'border-slate-200')}>
      <button
        onClick={() => (hasSchoolPlan || hasContent) && setOpen(!open)}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3 text-left',
          hasSchoolPlan ? 'hover:bg-blue-50/50 cursor-pointer' : 'cursor-default',
        )}
      >
        <div className="mt-0.5 shrink-0">
          {hasSchoolPlan ? (
            open ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronRight className="w-4 h-4 text-blue-500" />
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-700 leading-relaxed">{comp.description}</p>
        </div>
        <div className="shrink-0 flex gap-1 items-center">
          {hasSchoolPlan && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full flex items-center gap-1">
              <School className="w-3 h-3" />
              {comp.school_plan!.term ?? 'Planifié'}
            </span>
          )}
          {hasContent && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
              {comp.school_plan!.content.length} ressource{comp.school_plan!.content.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {open && hasSchoolPlan && (
        <div className="border-t border-blue-100 bg-blue-50/50 px-4 py-3 space-y-2">
          {comp.school_plan!.notes && (
            <div className="flex items-start gap-2 text-sm text-slate-600">
              <Calendar className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
              <span>{comp.school_plan!.notes}</span>
            </div>
          )}
          {comp.school_plan!.week_from && (
            <p className="text-xs text-slate-500 ml-6">
              Semaines {comp.school_plan!.week_from}–{comp.school_plan!.week_to}
            </p>
          )}
          {comp.school_plan!.content.map((c, i) => (
            <a
              key={i}
              href={c.ref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-700 hover:underline ml-6"
            >
              {c.type === 'external_url' ? <ExternalLink className="w-3.5 h-3.5 shrink-0" /> : <BookOpen className="w-3.5 h-3.5 shrink-0" />}
              {c.label ?? c.ref}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function flattenComp(c: StudentProgramme['domains'][0]['competencies'][0]) {
  return c;
}

function DomainBlock({ domain }: { domain: CurriculumDomain }) {
  const [open, setOpen] = useState(true);
  const planned = domain.competencies.filter((c) => c.school_plan).length;
  const colorClass = DOMAIN_COLORS[domain.code] ?? 'bg-slate-100 text-slate-800 border-slate-200';
  const dotClass = DOMAIN_DOT[domain.code] ?? 'bg-slate-400';

  // Group by sub_domain
  const grouped: Record<string, typeof domain.competencies> = {};
  for (const c of domain.competencies) {
    const key = c.sub_domain ?? 'Général';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(c);
  }

  return (
    <div className={cn('border rounded-xl overflow-hidden', colorClass.split(' ')[0].replace('bg-', 'border-').replace('100', '200'))}>
      <button
        onClick={() => setOpen(!open)}
        className={cn('w-full flex items-center gap-3 px-5 py-4 text-left border-b', colorClass)}
      >
        <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', dotClass)} />
        <div className="flex-1">
          <h3 className="font-semibold text-sm">{domain.name}</h3>
          <p className="text-xs opacity-70 mt-0.5">
            {domain.competencies.length} attendus
            {planned > 0 && ` · ${planned} planifiés par l'école`}
          </p>
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>

      {open && (
        <div className="bg-white p-4 space-y-4">
          {Object.entries(grouped).map(([subDomain, comps]) => (
            <div key={subDomain}>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">{subDomain}</p>
              <div className="space-y-2">
                {comps.map((c) => <CompetencyRow key={c.id} comp={c} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProgrammePage() {
  const { studentId } = useParams<{ studentId: string }>();
  const [data, setData] = useState<StudentProgramme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!studentId) return;
    getStudentProgramme(studentId)
      .then(({ data }) => setData(data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [studentId]);

  if (loading) return <div className="flex justify-center py-12"><Spinner /></div>;
  if (error || !data) return (
    <div className="text-center py-12 text-muted-foreground">
      <p>Programme non disponible.</p>
      <Link to="/children" className="text-sm text-blue-600 hover:underline mt-2 block">← Retour</Link>
    </div>
  );

  const totalPlanned = data.domains.reduce((s, d) => s + d.competencies.filter((c) => c.school_plan).length, 0);
  const totalComps = data.domains.reduce((s, d) => s + d.competencies.length, 0);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/children" className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ChevronRight className="w-4 h-4 rotate-180" /> Mes enfants
        </Link>
      </div>

      {/* Programme header card */}
      <div className="border rounded-2xl overflow-hidden shadow-sm">
        <div className="bg-slate-800 text-white px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-300 text-sm">Programme scolaire</p>
              <h1 className="text-xl font-bold mt-0.5">
                {data.group_name ?? data.detected_level}
              </h1>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{data.detected_level}</div>
              <div className="text-slate-400 text-xs">Niveau détecté</div>
            </div>
          </div>
        </div>

        {/* Source + coverage */}
        <div className="px-6 py-4 flex flex-wrap gap-4 border-b bg-slate-50 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <Globe className="w-4 h-4 text-slate-400" />
            <span>
              <strong className="text-slate-800">Programme officiel :</strong>{' '}
              {data.framework?.name ?? 'Non disponible'}
            </span>
          </div>
          {data.framework?.source && (
            <div className="text-xs text-slate-400">{data.framework.source}</div>
          )}
        </div>

        {/* Progress bar */}
        {totalComps > 0 && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600">Objectifs planifiés par l'école</span>
              <span className="font-semibold text-slate-800">{totalPlanned} / {totalComps}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{ width: `${Math.round((totalPlanned / totalComps) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1.5">
              {totalPlanned === 0
                ? "L'école n'a pas encore planifié ce programme — contactez l'enseignant."
                : `${Math.round((totalPlanned / totalComps) * 100)}% des attendus du programme ont été planifiés`}
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-500" />
          Planifié par l'école (cliquer pour détails)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-500" />
          Ressources associées
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300" />
          Attendu national (non planifié)
        </span>
      </div>

      {/* Domains */}
      <div className="space-y-4">
        {data.domains.map((domain) => (
          <DomainBlock key={domain.id} domain={domain} />
        ))}
      </div>

      {data.domains.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p className="text-4xl mb-3">📚</p>
          <p className="font-medium">Aucun programme disponible pour ce niveau.</p>
          <p className="text-sm mt-1">Les données du programme national seront ajoutées prochainement.</p>
        </div>
      )}
    </div>
  );
}
