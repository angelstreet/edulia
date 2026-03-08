import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { getSessions, type SessionData } from '../../../api/timetable';
import { getAttendance, createAttendanceBulk, type AttendanceRecordData } from '../../../api/attendance';
import { getGroups, getGroup, type GroupData, type GroupMember } from '../../../api/groups';
import { getSubjects, type SubjectData } from '../../../api/subjects';

type AttendanceStatus = 'present' | 'absent' | 'late';

interface StudentRow {
  student_id: string;
  display_name: string;
  status: AttendanceStatus;
  late_minutes: number | null;
  existing_id: string | null; // if already saved
}

export function AttendancePage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [subjects, setSubjects] = useState<Record<string, SubjectData>>({});
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load groups & subjects
  useEffect(() => {
    async function load() {
      try {
        const [groupsRes, subjectsRes] = await Promise.all([getGroups(), getSubjects()]);
        const gArr = Array.isArray(groupsRes.data) ? groupsRes.data : (groupsRes.data as { data: GroupData[] }).data || [];
        setGroups(gArr);
        if (gArr.length > 0) setSelectedGroupId(gArr[0].id);

        const sArr: SubjectData[] = Array.isArray(subjectsRes.data)
          ? subjectsRes.data
          : (subjectsRes.data as { data: SubjectData[] }).data || [];
        const sMap: Record<string, SubjectData> = {};
        for (const s of sArr) sMap[s.id] = s;
        setSubjects(sMap);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Load sessions when group changes
  useEffect(() => {
    if (!selectedGroupId) return;
    getSessions({ group_id: selectedGroupId }).then(({ data }) => {
      const arr = Array.isArray(data) ? data : [];
      setSessions(arr);
      if (arr.length > 0) setSelectedSessionId(arr[0].id);
      else setSelectedSessionId('');
    }).catch(() => setSessions([]));
  }, [selectedGroupId]);

  // Load students & existing attendance when session/date changes
  const loadStudents = useCallback(async () => {
    if (!selectedSessionId || !selectedGroupId) {
      setStudents([]);
      return;
    }
    try {
      // Get group members (students)
      const groupRes = await getGroup(selectedGroupId);
      const members: GroupMember[] = (groupRes.data.members || []).filter(
        (m) => m.role === 'member' || m.role === 'student',
      );

      // Get existing attendance records
      const attRes = await getAttendance({ session_id: selectedSessionId, date: selectedDate });
      const existing: AttendanceRecordData[] = Array.isArray(attRes.data) ? attRes.data : [];
      const existingMap = new Map(existing.map((r) => [r.student_id, r]));

      const rows: StudentRow[] = members.map((m) => {
        const rec = existingMap.get(m.user_id);
        return {
          student_id: m.user_id,
          display_name: m.display_name || m.email,
          status: (rec?.status as AttendanceStatus) || 'present',
          late_minutes: rec?.late_minutes ?? null,
          existing_id: rec?.id ?? null,
        };
      });
      setStudents(rows);
      setSaved(existing.length > 0);
    } catch {
      setStudents([]);
    }
  }, [selectedSessionId, selectedGroupId, selectedDate]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const toggleStatus = (index: number, status: AttendanceStatus) => {
    setStudents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], status, late_minutes: status === 'late' ? (next[index].late_minutes || 5) : null };
      return next;
    });
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedSessionId) return;
    setSaving(true);
    try {
      await createAttendanceBulk({
        session_id: selectedSessionId,
        date: selectedDate,
        records: students.map((s) => ({
          student_id: s.student_id,
          status: s.status,
          late_minutes: s.late_minutes ?? undefined,
        })),
      });
      setSaved(true);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const selectedSession = sessions.find((s) => s.id === selectedSessionId);
  const subjectName = selectedSession ? subjects[selectedSession.subject_id]?.name || '—' : '—';

  const presentCount = students.filter((s) => s.status === 'present').length;
  const absentCount = students.filter((s) => s.status === 'absent').length;
  const lateCount = students.filter((s) => s.status === 'late').length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('attendance', 'Attendance')}</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t('class', 'Class')}</label>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t('session', 'Session')}</label>
          <select
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
            value={selectedSessionId}
            onChange={(e) => setSelectedSessionId(e.target.value)}
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {subjects[s.subject_id]?.name || '—'} — {s.start_time?.slice(0, 5)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-muted-foreground">{t('date', 'Date')}</label>
          <input
            type="date"
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>
      </div>

      {/* Session info */}
      {selectedSession && (
        <div className="mb-4 text-sm text-muted-foreground">
          {subjectName} — {selectedSession.start_time?.slice(0, 5)} - {selectedSession.end_time?.slice(0, 5)}
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          title={t('noStudents', 'No students')}
          description={t('noStudentsDesc', 'Select a session with enrolled students to take attendance.')}
        />
      ) : (
        <>
          {/* Roll call table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <colgroup>
                <col className="w-10" />
                <col />
                <col className="w-16" />
                <col className="w-16" />
                <col className="w-16" />
                <col className="w-32" />
              </colgroup>
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="text-left px-4 py-2">#</th>
                  <th className="text-left px-4 py-2">{t('student', 'Student')}</th>
                  <th className="text-center px-2 py-2">{t('presentShort', 'P')}</th>
                  <th className="text-center px-2 py-2">{t('absentShort', 'A')}</th>
                  <th className="text-center px-2 py-2">{t('lateShort', 'R')}</th>
                  <th className="text-left px-4 py-2">{t('note', 'Note')}</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr key={s.student_id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2 text-muted-foreground">{i + 1}</td>
                    <td className="px-4 py-2 font-medium">{s.display_name}</td>
                    <td className="text-center px-2 py-2">
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${s.status === 'present' ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                        onClick={() => toggleStatus(i, 'present')}
                        aria-label="Present"
                      />
                    </td>
                    <td className="text-center px-2 py-2">
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${s.status === 'absent' ? 'bg-red-500 border-red-500' : 'border-gray-300'}`}
                        onClick={() => toggleStatus(i, 'absent')}
                        aria-label="Absent"
                      />
                    </td>
                    <td className="text-center px-2 py-2">
                      <button
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${s.status === 'late' ? 'bg-yellow-500 border-yellow-500' : 'border-gray-300'}`}
                        onClick={() => toggleStatus(i, 'late')}
                        aria-label="Late"
                      />
                    </td>
                    <td className="px-4 py-2 text-muted-foreground text-xs">
                      {s.status === 'late' && s.late_minutes ? `${s.late_minutes}min` : s.status === 'absent' && !s.existing_id ? t('noJustification', 'no justif.') : '\u00a0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary + save */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3 text-sm">
              <Badge variant="success">{presentCount} {t('present', 'present')}</Badge>
              <Badge variant="danger">{absentCount} {t('absent', 'absent')}</Badge>
              <Badge variant="warning">{lateCount} {t('late', 'late')}</Badge>
            </div>
            <Button variant="primary" loading={saving} onClick={handleSave}>
              {saved ? t('saved', 'Saved') : t('save')}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
