import { useTranslation } from 'react-i18next';
import { SessionCard } from './SessionCard';
import type { SessionData } from '../../../api/timetable';
import type { SubjectData } from '../../../api/subjects';

interface WeekGridProps {
  sessions: SessionData[];
  subjects: Record<string, SubjectData>;
  teachers: Record<string, string>;
  rooms: Record<string, string>;
}

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'] as const;
const HOURS = Array.from({ length: 10 }, (_, i) => i + 8); // 8:00 to 17:00

function formatTime(time: string): string {
  // time comes as "HH:MM:SS" or "HH:MM"
  return time.slice(0, 5);
}

function timeToHour(time: string): number {
  return parseInt(time.slice(0, 2), 10);
}

export function WeekGrid({ sessions, subjects, teachers, rooms }: WeekGridProps) {
  const { t } = useTranslation();

  const getSessionsForSlot = (dayIndex: number, hour: number) => {
    return sessions.filter(
      (s) => s.day_of_week === dayIndex && timeToHour(s.start_time) === hour,
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-6 gap-px bg-border min-w-[700px]">
        {/* Header row */}
        <div className="bg-card p-2 text-center text-xs font-medium text-muted-foreground" />
        {DAY_KEYS.map((day, i) => (
          <div key={i} className="bg-card p-2 text-center text-sm font-semibold">
            {t(day, day.charAt(0).toUpperCase() + day.slice(1))}
          </div>
        ))}

        {/* Time slots */}
        {HOURS.map((hour) => (
          <>
            <div key={`h-${hour}`} className="bg-card p-2 text-right text-xs text-muted-foreground">
              {String(hour).padStart(2, '0')}:00
            </div>
            {DAY_KEYS.map((_, dayIndex) => {
              const slotSessions = getSessionsForSlot(dayIndex, hour);
              return (
                <div key={`${dayIndex}-${hour}`} className="bg-card p-1 min-h-[60px]">
                  {slotSessions.map((s) => {
                    const subject = subjects[s.subject_id];
                    return (
                      <SessionCard
                        key={s.id}
                        subjectName={subject?.name || '—'}
                        subjectColor={subject?.color || '#6b7280'}
                        teacherName={teachers[s.teacher_id] || '—'}
                        roomName={s.room_id ? rooms[s.room_id] || null : null}
                        startTime={formatTime(s.start_time)}
                        endTime={formatTime(s.end_time)}
                        status={s.status}
                      />
                    );
                  })}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
