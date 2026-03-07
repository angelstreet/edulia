import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { WeekGrid } from '../components/WeekGrid';
import { getSessions, getRooms, type SessionData, type RoomData } from '../../../api/timetable';
import { getSubjects, type SubjectData } from '../../../api/subjects';
import { getGroups, getMyGroups, type GroupData } from '../../../api/groups';
import { getUsers, type UserData } from '../../../api/users';
import { getDirectory } from '../../../api/community';
import { getDashboardStats } from '../../../api/dashboard';
import { useAuthStore } from '../../../stores/authStore';

export function TimetablePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setStudentGroup = useAuthStore((s) => s.setStudentGroup);
  const isStudent = user?.role === 'student';
  const isParent = user?.role === 'parent';

  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [subjects, setSubjects] = useState<Record<string, SubjectData>>({});
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [roomMap, setRoomMap] = useState<Record<string, string>>({});
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Load reference data on mount
  useEffect(() => {
    async function loadRefData() {
      try {
        const groupFetch = isStudent ? getMyGroups() : getGroups();
        const extraFetch = isParent
          ? Promise.all([getDashboardStats(), getDirectory()])
          : Promise.resolve(null);

        const [subjectsRes, usersRes, groupsRes, roomsRes, parentExtra] = await Promise.all([
          getSubjects(),
          getUsers({ role: 'teacher', per_page: 500 }),
          groupFetch,
          getRooms(),
          extraFetch,
        ]);

        const subjectsArr: SubjectData[] = Array.isArray(subjectsRes.data)
          ? subjectsRes.data
          : (subjectsRes.data as { data: SubjectData[] }).data || [];
        const subjectMap: Record<string, SubjectData> = {};
        for (const s of subjectsArr) subjectMap[s.id] = s;
        setSubjects(subjectMap);

        const usersArr: UserData[] = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data.items || [];
        const teacherMap: Record<string, string> = {};
        for (const u of usersArr) teacherMap[u.id] = u.display_name;
        setTeachers(teacherMap);

        const allGroupsArr: GroupData[] = Array.isArray(groupsRes.data)
          ? groupsRes.data
          : (groupsRes.data as { data: GroupData[] }).data || [];

        let groupsArr = allGroupsArr;

        if (isParent && parentExtra) {
          const [statsRes, dirRes] = parentExtra;
          const children = statsRes.data.children ?? [];
          const dirList = Array.isArray(dirRes.data) ? dirRes.data : [];
          const childGroupNames = new Set<string>();
          for (const child of children) {
            const entry = dirList.find((u: { id: string; group_name?: string | null }) => u.id === child.id);
            if (entry?.group_name) childGroupNames.add(entry.group_name);
          }
          groupsArr = allGroupsArr.filter((g) => childGroupNames.has(g.name));
        }

        setGroups(groupsArr);
        if (groupsArr.length > 0) {
          setSelectedGroupId(groupsArr[0].id);
          if (isStudent) setStudentGroup({ id: String(groupsArr[0].id), name: groupsArr[0].name });
        }

        const roomsArr: RoomData[] = Array.isArray(roomsRes.data) ? roomsRes.data : [];
        const rMap: Record<string, string> = {};
        for (const r of roomsArr) rMap[r.id] = r.name;
        setRoomMap(rMap);
      } catch {
        // ignore
      }
    }
    loadRefData();
  }, [isStudent, isParent, setStudentGroup]);

  const fetchSessions = useCallback(async () => {
    if (!selectedGroupId) return;
    setLoading(true);
    try {
      const { data } = await getSessions({ group_id: selectedGroupId });
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedGroupId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('timetable', 'Timetable')}</h1>
        {!isStudent && !isParent && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{t('class', 'Class')}:</label>
            <select
              className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {isParent && groups.length > 0 && (
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">{t('class', 'Class')}:</label>
            <span className="h-9 flex items-center px-3 text-sm rounded-md border border-input bg-muted/40 text-muted-foreground">
              {groups.find((g) => g.id === selectedGroupId)?.name ?? groups[0]?.name}
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : sessions.length === 0 ? (
        <EmptyState
          title={t('noSessions', 'No sessions yet')}
          description={t('noSessionsDesc', 'No timetable sessions have been created for this class.')}
        />
      ) : (
        <WeekGrid sessions={sessions} subjects={subjects} teachers={teachers} rooms={roomMap} />
      )}
    </div>
  );
}
