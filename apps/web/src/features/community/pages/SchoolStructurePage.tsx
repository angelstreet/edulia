import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, GraduationCap, Shield, Users } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { getGroups, getGroup, type GroupData, type GroupMember } from '../../../api/groups';
import { getDirectory, type DirectoryUser } from '../../../api/community';
import { useCurrentUser } from '../../../hooks/useCurrentUser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassNode {
  group: GroupData;
  levelName: string | null;
}

interface LoadedClass {
  groupId: string;
  teachers: GroupMember[];
  students: GroupMember[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildTree(groups: GroupData[]): { levels: GroupData[]; classesByLevel: Record<string, GroupData[]>; rootClasses: GroupData[] } {
  const levels = groups.filter((g) => !g.parent_id && g.type !== 'class').sort((a, b) => a.name.localeCompare(b.name));
  const rootClasses = groups.filter((g) => !g.parent_id && g.type === 'class').sort((a, b) => a.name.localeCompare(b.name));
  const classesByLevel: Record<string, GroupData[]> = {};
  for (const level of levels) {
    classesByLevel[level.id] = groups
      .filter((g) => g.parent_id === level.id)
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  return { levels, classesByLevel, rootClasses };
}

function splitMembers(members: GroupMember[]) {
  return {
    teachers: members.filter((m) => m.role === 'teacher' || m.role === 'leader'),
    students: members.filter((m) => m.role === 'member'),
  };
}

// ─── Direction card ───────────────────────────────────────────────────────────

function DirectionSection({ staff }: { staff: DirectoryUser[] }) {
  const { t } = useTranslation();
  if (staff.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          {t('direction', 'Direction')}
        </h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <div className="border rounded-xl bg-card shadow-sm p-5">
        <div className="flex flex-wrap gap-3">
          {staff.map((u) => (
            <div key={u.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-tight">{u.display_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{t(u.role, u.role)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ClassCard ────────────────────────────────────────────────────────────────
// Teachers are always visible. Students expand on click.

function ClassCard({ group }: { group: GroupData }) {
  const { t } = useTranslation();
  const [studentsOpen, setStudentsOpen] = useState(false);
  const [loaded, setLoaded] = useState<LoadedClass | null>(null);
  const [loading, setLoading] = useState(true);

  // Always auto-load on mount so teachers are immediately visible
  useEffect(() => {
    getGroup(group.id)
      .then(({ data }) => {
        const { teachers, students } = splitMembers(data.members ?? []);
        setLoaded({ groupId: group.id, teachers, students });
      })
      .catch(() => setLoaded({ groupId: group.id, teachers: [], students: [] }))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group.id]);

  return (
    <div className="border rounded-xl bg-card overflow-hidden shadow-sm">
      {/* Class header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-base">{group.name}</p>
        </div>
      </div>

      {/* Teachers — always visible */}
      <div className="border-t px-5 py-3">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Spinner />
          </div>
        ) : loaded && loaded.teachers.length > 0 ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
              {t('teachers', 'Teachers')}
            </p>
            <div className="flex flex-wrap gap-2">
              {loaded.teachers.map((teacher) => (
                <div key={teacher.user_id} className="flex flex-col px-3 py-2 rounded-lg bg-blue-50 border border-blue-100 min-w-[100px]">
                  <span className="text-sm font-semibold text-blue-700 leading-tight">{teacher.display_name}</span>
                  <span className="text-xs text-blue-500 leading-tight mt-0.5">
                    {teacher.subjects && teacher.subjects.length > 0 ? teacher.subjects.join(', ') : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          !loading && <p className="text-xs text-muted-foreground">{t('noTeachersAssigned', 'No teachers assigned')}</p>
        )}
      </div>

      {/* Students — collapsible */}
      {loaded && loaded.students.length > 0 && (
        <div className="border-t">
          <button
            onClick={() => setStudentsOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2.5 text-left hover:bg-accent/5 transition-colors"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t('students', 'Students')} ({loaded.students.length})
            </p>
            {studentsOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
          {studentsOpen && (
            <div className="px-5 pb-4">
              <div className="flex flex-wrap gap-1.5">
                {loaded.students.map((s) => (
                  <span
                    key={s.user_id}
                    className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium"
                  >
                    {s.display_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Level section ────────────────────────────────────────────────────────────

function LevelSection({ name, classes }: { name: string; classes: GroupData[] }) {
  if (classes.length === 0) return null;
  return (
    <section>
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{name}</h2>
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground">{classes.length} {classes.length === 1 ? 'class' : 'classes'}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {classes.map((c) => (
          <ClassCard key={c.id} group={c} />
        ))}
      </div>
    </section>
  );
}

// ─── School summary banner ─────────────────────────────────────────────────────

function SchoolBanner({ groups, adminCount }: { groups: GroupData[]; adminCount: number }) {
  const { t } = useTranslation();
  const classCount = groups.filter((g) => g.type === 'class').length;
  const totalStudents = groups
    .filter((g) => g.type === 'class')
    .reduce((sum, g) => sum + g.member_count, 0);

  return (
    <div className="rounded-xl border bg-gradient-to-r from-primary/5 to-primary/10 p-5 flex flex-wrap gap-6 items-center">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('classes', 'Classes')}</p>
          <p className="text-2xl font-bold">{classCount}</p>
        </div>
      </div>
      <div className="w-px h-8 bg-border hidden sm:block" />
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('students', 'Students')}</p>
        <p className="text-2xl font-bold">{totalStudents}</p>
      </div>
      {adminCount > 0 && (
        <>
          <div className="w-px h-8 bg-border hidden sm:block" />
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{t('staff', 'Staff')}</p>
            <p className="text-2xl font-bold">{adminCount}</p>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SchoolStructurePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role ?? 'student';

  const [allGroups, setAllGroups] = useState<GroupData[]>([]);
  const [adminStaff, setAdminStaff] = useState<DirectoryUser[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassNode[] | null>(null); // null = show all
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [groupsRes, adminRes] = await Promise.all([
          getGroups(),
          getDirectory({ role: 'admin' }),
        ]);
        const groups: GroupData[] = Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data.data ?? []);
        setAllGroups(groups);
        setAdminStaff(Array.isArray(adminRes.data) ? adminRes.data : []);

        if (role === 'student' && user?.id) {
          // Students only see their own class
          const { data: dir } = await getDirectory();
          const me = Array.isArray(dir) ? dir.find((u) => u.id === user.id) : null;
          if (me?.group_name) {
            const myGroup = groups.find((g) => g.name === me.group_name);
            if (myGroup) {
              const levelGroup = myGroup.parent_id ? groups.find((g) => g.id === myGroup.parent_id) : null;
              setFilteredClasses([{ group: myGroup, levelName: levelGroup?.name ?? null }]);
            } else {
              setFilteredClasses([]);
            }
          } else {
            setFilteredClasses([]);
          }
        }
        // admin / teacher / parent → filteredClasses stays null → show full org chart
      } catch {
        setAllGroups([]);
        setFilteredClasses([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [role, user?.id]);

  if (loading) {
    return <div className="flex justify-center py-16"><Spinner /></div>;
  }

  // ── Restricted view (student / parent) ──────────────────────────────────────
  if (filteredClasses !== null) {
    if (filteredClasses.length === 0) {
      return (
        <div className="space-y-6">
          <DirectionSection staff={adminStaff} />
          <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
            <GraduationCap className="w-10 h-10 text-muted-foreground" />
            <p className="text-muted-foreground">{t('noClassAssigned', 'No class assigned yet.')}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <DirectionSection staff={adminStaff} />
        {filteredClasses.map(({ group, levelName }) => (
          <div key={group.id}>
            {levelName && (
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{levelName}</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <ClassCard group={group} />
          </div>
        ))}
      </div>
    );
  }

  // ── Full view (admin / teacher) ──────────────────────────────────────────────
  const { levels, classesByLevel, rootClasses } = buildTree(allGroups);

  if (levels.length === 0 && rootClasses.length === 0) {
    return (
      <div className="space-y-6">
        <DirectionSection staff={adminStaff} />
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <GraduationCap className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t('noClassesYet', 'No classes created yet.')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SchoolBanner groups={allGroups} adminCount={adminStaff.length} />

      {/* Direction — admin staff at top of org chart */}
      <DirectionSection staff={adminStaff} />

      {/* Levels with their classes */}
      {levels.map((level) => (
        <LevelSection
          key={level.id}
          name={level.name}
          classes={classesByLevel[level.id] ?? []}
        />
      ))}

      {/* Classes not under any level */}
      {rootClasses.length > 0 && (
        <LevelSection name={t('other', 'Other')} classes={rootClasses} />
      )}
    </div>
  );
}
