export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
  PARENT: 'parent',
  TUTOR: 'tutor',
} as const;

export type RoleCode = (typeof ROLES)[keyof typeof ROLES];
