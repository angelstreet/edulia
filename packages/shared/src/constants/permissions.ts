/**
 * Permission codes follow the pattern: module.entity.action
 */
export const PERMISSIONS = {
  // Attendance
  ATTENDANCE_RECORD_CREATE: 'attendance.record.create',
  ATTENDANCE_RECORD_VIEW: 'attendance.record.view',
  ATTENDANCE_RECORD_EDIT: 'attendance.record.edit',
  ATTENDANCE_RECORD_JUSTIFY: 'attendance.record.justify',

  // Gradebook
  GRADEBOOK_GRADE_CREATE: 'gradebook.grade.create',
  GRADEBOOK_GRADE_VIEW: 'gradebook.grade.view',
  GRADEBOOK_GRADE_EDIT: 'gradebook.grade.edit',
  GRADEBOOK_GRADE_PUBLISH: 'gradebook.grade.publish',
  GRADEBOOK_ASSESSMENT_CREATE: 'gradebook.assessment.create',
  GRADEBOOK_ASSESSMENT_EDIT: 'gradebook.assessment.edit',

  // Timetable
  TIMETABLE_SESSION_CREATE: 'timetable.session.create',
  TIMETABLE_SESSION_VIEW: 'timetable.session.view',
  TIMETABLE_SESSION_EDIT: 'timetable.session.edit',
  TIMETABLE_SESSION_DELETE: 'timetable.session.delete',

  // Homework
  HOMEWORK_ASSIGNMENT_CREATE: 'homework.assignment.create',
  HOMEWORK_ASSIGNMENT_VIEW: 'homework.assignment.view',
  HOMEWORK_ASSIGNMENT_EDIT: 'homework.assignment.edit',
  HOMEWORK_SUBMISSION_CREATE: 'homework.submission.create',
  HOMEWORK_SUBMISSION_VIEW: 'homework.submission.view',
  HOMEWORK_SUBMISSION_GRADE: 'homework.submission.grade',

  // Quiz
  QUIZ_QUIZ_CREATE: 'quiz.quiz.create',
  QUIZ_QUIZ_VIEW: 'quiz.quiz.view',
  QUIZ_QUIZ_EDIT: 'quiz.quiz.edit',
  QUIZ_QUIZ_PUBLISH: 'quiz.quiz.publish',
  QUIZ_ATTEMPT_CREATE: 'quiz.attempt.create',
  QUIZ_ATTEMPT_VIEW: 'quiz.attempt.view',

  // Messaging
  MESSAGING_THREAD_CREATE: 'messaging.thread.create',
  MESSAGING_THREAD_VIEW: 'messaging.thread.view',
  MESSAGING_THREAD_SEND: 'messaging.thread.send',

  // Notifications
  NOTIFICATION_NOTIFICATION_VIEW: 'notification.notification.view',
  NOTIFICATION_NOTIFICATION_CREATE: 'notification.notification.create',

  // Files
  FILES_FILE_UPLOAD: 'files.file.upload',
  FILES_FILE_VIEW: 'files.file.view',
  FILES_FILE_DELETE: 'files.file.delete',

  // Billing
  BILLING_INVOICE_CREATE: 'billing.invoice.create',
  BILLING_INVOICE_VIEW: 'billing.invoice.view',
  BILLING_INVOICE_EDIT: 'billing.invoice.edit',
  BILLING_PAYMENT_CREATE: 'billing.payment.create',
  BILLING_PAYMENT_VIEW: 'billing.payment.view',

  // Users
  USERS_USER_CREATE: 'users.user.create',
  USERS_USER_VIEW: 'users.user.view',
  USERS_USER_EDIT: 'users.user.edit',
  USERS_USER_DELETE: 'users.user.delete',
  USERS_USER_INVITE: 'users.user.invite',

  // Groups
  GROUPS_GROUP_CREATE: 'groups.group.create',
  GROUPS_GROUP_VIEW: 'groups.group.view',
  GROUPS_GROUP_EDIT: 'groups.group.edit',
  GROUPS_GROUP_DELETE: 'groups.group.delete',
  GROUPS_MEMBER_MANAGE: 'groups.member.manage',

  // Tenant
  TENANT_SETTINGS_VIEW: 'tenant.settings.view',
  TENANT_SETTINGS_EDIT: 'tenant.settings.edit',

  // School Life
  SCHOOL_LIFE_INCIDENT_CREATE: 'school_life.incident.create',
  SCHOOL_LIFE_INCIDENT_VIEW: 'school_life.incident.view',
  SCHOOL_LIFE_INCIDENT_EDIT: 'school_life.incident.edit',
  SCHOOL_LIFE_SANCTION_CREATE: 'school_life.sanction.create',
  SCHOOL_LIFE_SANCTION_VIEW: 'school_life.sanction.view',

  // Enrollment
  ENROLLMENT_FORM_CREATE: 'enrollment.form.create',
  ENROLLMENT_FORM_VIEW: 'enrollment.form.view',
  ENROLLMENT_SUBMISSION_CREATE: 'enrollment.submission.create',
  ENROLLMENT_SUBMISSION_REVIEW: 'enrollment.submission.review',

  // Tutoring
  TUTORING_SESSION_CREATE: 'tutoring.session.create',
  TUTORING_SESSION_VIEW: 'tutoring.session.view',
  TUTORING_SESSION_EDIT: 'tutoring.session.edit',
  TUTORING_SESSION_CANCEL: 'tutoring.session.cancel',
  TUTORING_PLAN_CREATE: 'tutoring.plan.create',
  TUTORING_PLAN_VIEW: 'tutoring.plan.view',

  // Report Cards
  REPORT_CARD_GENERATE: 'report_card.card.generate',
  REPORT_CARD_VIEW: 'report_card.card.view',
  REPORT_CARD_PUBLISH: 'report_card.card.publish',

  // Calendar
  CALENDAR_EVENT_CREATE: 'calendar.event.create',
  CALENDAR_EVENT_VIEW: 'calendar.event.view',
  CALENDAR_EVENT_EDIT: 'calendar.event.edit',

  // Audit
  AUDIT_LOG_VIEW: 'audit.log.view',
} as const;

export type PermissionCode = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
