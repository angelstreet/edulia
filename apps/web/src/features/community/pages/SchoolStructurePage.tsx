import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp, GraduationCap, Users } from 'lucide-react';
import { Spinner } from '../../../components/ui/Spinner';
import { getGroups, getGroup, type GroupData, type GroupMember } from '../../../api/groups';
import { getDirectory } from '../../../api/community';
import { getDashboardStats } from '../../../api/dashboard';
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

// ─── ClassCard ────────────────────────────────────────────────────────────────

function ClassCard({
  group,
  defaultOpen = false,
}: {
  group: GroupData;
  defaultOpen?: boolean;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen);
  const [loaded, setLoaded] = useState<LoadedClass | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    if (!open && !loaded) {
      setLoading(true);
      try {
        const { data } = await getGroup(group.id);
        const { teachers, students } = splitMembers(data.members ?? []);
        setLoaded({ groupId: group.id, teachers, students });
      } catch {
        setLoaded({ groupId: group.id, teachers: [], students: [] });
      } finally {
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  // auto-load when defaultOpen
  useEffect(() => {
    if (defaultOpen && !loaded) {
      setLoading(true);
      getGroup(group.id)
        .then(({ data }) => {
          const { teachers, students } = splitMembers(data.members ?? []);
          setLoaded({ groupId: group.id, teachers, students });
        })
        .catch(() => setLoaded({ groupId: group.id, teachers: [], students: [] }))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="border rounded-xl bg-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Card header */}
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left gap-3 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">{group.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {group.member_count} {t('members', 'members')}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-muted-foreground">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="border-t px-5 py-4 space-y-4">
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : loaded ? (
            <>
              {/* Teachers */}
              {loaded.teachers.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t('teachers', 'Teachers')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {loaded.teachers.map((t) => (
                      <span
                        key={t.user_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium border border-blue-100"
                      >
                        {t.display_name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Students */}
              {loaded.students.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {t('students', 'Students')} ({loaded.students.length})
                  </p>
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
              ) : (
                <p className="text-sm text-muted-foreground">{t('noStudents', 'No students yet.')}</p>
              )}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── Level section ────────────────────────────────────────────────────────────

function LevelSection({ name, classes, defaultOpenId }: { name: string; classes: GroupData[]; defaultOpenId?: string }) {
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
          <ClassCard key={c.id} group={c} defaultOpen={c.id === defaultOpenId} />
        ))}
      </div>
    </section>
  );
}

// ─── School summary banner ─────────────────────────────────────────────────────

function SchoolBanner({ groups }: { groups: GroupData[] }) {
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
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SchoolStructurePage() {
  const { t } = useTranslation();
  const user = useCurrentUser();
  const role = user?.role ?? 'student';

  const [allGroups, setAllGroups] = useState<GroupData[]>([]);
  const [filteredClasses, setFilteredClasses] = useState<ClassNode[] | null>(null); // null = show all
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const { data } = await getGroups();
        const groups: GroupData[] = data.data ?? [];
        setAllGroups(groups);

        if (role === 'student' && user?.id) {
          // Find this student's group via directory
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
        } else if (role === 'parent' && user?.id) {
          // Find each child's group
          const { data: stats } = await getDashboardStats();
          const children = stats.children ?? [];
          if (children.length === 0) { setFilteredClasses([]); return; }

          const { data: dir } = await getDirectory();
          const dirList = Array.isArray(dir) ? dir : [];

          const nodes: ClassNode[] = [];
          for (const child of children) {
            const childEntry = dirList.find((u) => u.id === child.id);
            if (childEntry?.group_name) {
              const grp = groups.find((g) => g.name === childEntry.group_name);
              if (grp) {
                const levelGroup = grp.parent_id ? groups.find((g) => g.id === grp.parent_id) : null;
                nodes.push({ group: grp, levelName: levelGroup?.name ?? null });
              }
            }
          }
          setFilteredClasses(nodes);
        }
        // admin / teacher → filteredClasses stays null → show all
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
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <GraduationCap className="w-10 h-10 text-muted-foreground" />
          <p className="text-muted-foreground">{t('noClassAssigned', 'No class assigned yet.')}</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {filteredClasses.map(({ group, levelName }) => (
          <div key={group.id}>
            {levelName && (
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{levelName}</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <ClassCard group={group} defaultOpen />
          </div>
        ))}
      </div>
    );
  }

  // ── Full view (admin / teacher) ──────────────────────────────────────────────
  const { levels, classesByLevel, rootClasses } = buildTree(allGroups);

  if (levels.length === 0 && rootClasses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
        <GraduationCap className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">{t('noClassesYet', 'No classes created yet.')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SchoolBanner groups={allGroups} />

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
