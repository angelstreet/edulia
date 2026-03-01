export const MODULES = {
  TIMETABLE: 'timetable',
  ATTENDANCE: 'attendance',
  GRADEBOOK: 'gradebook',
  HOMEWORK: 'homework',
  QUIZ: 'quiz',
  MESSAGING: 'messaging',
  NOTIFICATIONS: 'notifications',
  FILES: 'files',
  BILLING: 'billing',
  SCHOOL_LIFE: 'school_life',
  ENROLLMENT: 'enrollment',
  TUTORING: 'tutoring',
  REPORT_CARDS: 'report_cards',
  CALENDAR: 'calendar',
  AUDIT: 'audit',
} as const;

export type ModuleCode = (typeof MODULES)[keyof typeof MODULES];
