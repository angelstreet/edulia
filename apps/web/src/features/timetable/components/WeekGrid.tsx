import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  return time.slice(0, 5);
}

function timeToHour(time: string): number {
  return parseInt(time.slice(0, 2), 10);
}

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun, 1=Mon…
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function formatMonthYear(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

function formatDayDate(d: Date, locale: string): string {
  return d.toLocaleDateString(locale, { day: 'numeric' });
}

export function WeekGrid({ sessions, subjects, teachers, rooms }: WeekGridProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'fr' ? 'fr-FR' : 'en-GB';

  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const prevWeek = () => setWeekStart((d) => addDays(d, -7));
  const nextWeek = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(getMonday(new Date()));

  const weekDays = DAY_KEYS.map((_, i) => addDays(weekStart, i));
  const weekEnd = addDays(weekStart, 4);

  // Label: "3 – 7 March 2026" or "31 March – 4 April 2026"
  const startMonth = weekStart.toLocaleDateString(locale, { month: 'long' });
  const endMonth = weekEnd.toLocaleDateString(locale, { month: 'long' });
  const year = weekEnd.getFullYear();
  const weekLabel =
    startMonth === endMonth
      ? `${formatDayDate(weekStart, locale)} – ${formatDayDate(weekEnd, locale)} ${startMonth} ${year}`
      : `${formatDayDate(weekStart, locale)} ${startMonth} – ${formatDayDate(weekEnd, locale)} ${endMonth} ${year}`;

  const todayMonday = getMonday(new Date()).getTime();
  const isCurrentWeek = weekStart.getTime() === todayMonday;

  const getSessionsForSlot = (dayIndex: number, hour: number) => {
    return sessions.filter(
      (s) => s.day_of_week === dayIndex && timeToHour(s.start_time) === hour,
    );
  };

  return (
    <div>
      {/* Week navigation */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-1.5 rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextWeek}
            className="p-1.5 rounded-md border border-input bg-background hover:bg-muted transition-colors"
            aria-label="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-foreground">{weekLabel}</span>
        </div>
        {!isCurrentWeek && (
          <button
            onClick={goToday}
            className="text-xs px-3 py-1.5 rounded-md border border-input bg-background hover:bg-muted transition-colors text-muted-foreground"
          >
            {t('today', 'Today')}
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid grid-cols-6 gap-px bg-border min-w-[700px]">
          {/* Header row */}
          <div className="bg-card p-2 text-center text-xs font-medium text-muted-foreground" />
          {DAY_KEYS.map((day, i) => {
            const date = weekDays[i];
            const isToday = date.toDateString() === new Date().toDateString();
            return (
              <div
                key={i}
                className={`bg-card p-2 text-center ${isToday ? 'bg-primary/5' : ''}`}
              >
                <div className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>
                  {t(day, day.charAt(0).toUpperCase() + day.slice(1))}
                </div>
                <div className={`text-xs mt-0.5 ${isToday ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                  {date.toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                </div>
              </div>
            );
          })}

          {/* Time slots */}
          {HOURS.map((hour) => (
            <>
              <div key={`h-${hour}`} className="bg-card p-2 text-right text-xs text-muted-foreground">
                {String(hour).padStart(2, '0')}:00
              </div>
              {DAY_KEYS.map((_, dayIndex) => {
                const slotSessions = getSessionsForSlot(dayIndex, hour);
                const date = weekDays[dayIndex];
                const isToday = date.toDateString() === new Date().toDateString();
                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className={`bg-card p-1 min-h-[80px] ${isToday ? 'bg-primary/5' : ''}`}
                  >
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
    </div>
  );
}
