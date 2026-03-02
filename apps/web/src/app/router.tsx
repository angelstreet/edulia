import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { AcceptInvitePage } from '../features/auth/pages/AcceptInvitePage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { UsersPage } from '../features/admin/pages/UsersPage';
import { ClassesPage } from '../features/admin/pages/ClassesPage';
import { SubjectsPage } from '../features/admin/pages/SubjectsPage';
import { AcademicYearPage } from '../features/admin/pages/AcademicYearPage';
import { TenantSettingsPage } from '../features/admin/pages/TenantSettingsPage';
import { MessagesPage } from '../features/messaging/pages/MessagesPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
import { TimetablePage } from '../features/timetable/pages/TimetablePage';
import { AttendancePage } from '../features/attendance/pages/AttendancePage';
import { GradebookPage } from '../features/gradebook/pages/GradebookPage';
import { GradeEntryPage } from '../features/gradebook/pages/GradeEntryPage';
import { StudentGradesPage } from '../features/gradebook/pages/StudentGradesPage';
import { HomeworkPage } from '../features/homework/pages/HomeworkPage';
import { SubmissionPage } from '../features/homework/pages/SubmissionPage';
import { DirectoryPage } from '../features/community/pages/DirectoryPage';
import { DocumentsPage } from '../features/documents/pages/DocumentsPage';
import { FormsListPage } from '../features/forms/pages/FormsListPage';
import { FormBuilderPage } from '../features/forms/pages/FormBuilderPage';
import { FormFillPage } from '../features/forms/pages/FormFillPage';
import { FormResultsPage } from '../features/forms/pages/FormResultsPage';
import { AuthGuard } from './guards/AuthGuard';
import { RoleGuard } from './guards/RoleGuard';
import { AppShell } from '../components/layout/AppShell';

export const router = createBrowserRouter([
  // Public routes
  { path: '/login', element: <LoginPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password/:token', element: <ResetPasswordPage /> },
  { path: '/invite/:token', element: <AcceptInvitePage /> },

  // Authenticated routes
  {
    path: '/',
    element: (
      <AuthGuard>
        <AppShell />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      {
        path: 'admin/users',
        element: (
          <RoleGuard roles={['admin']}>
            <UsersPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/classes',
        element: (
          <RoleGuard roles={['admin']}>
            <ClassesPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/subjects',
        element: (
          <RoleGuard roles={['admin']}>
            <SubjectsPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/academic-year',
        element: (
          <RoleGuard roles={['admin']}>
            <AcademicYearPage />
          </RoleGuard>
        ),
      },
      {
        path: 'admin/settings',
        element: (
          <RoleGuard roles={['admin']}>
            <TenantSettingsPage />
          </RoleGuard>
        ),
      },
      { path: 'timetable', element: <TimetablePage /> },
      { path: 'attendance', element: <AttendancePage /> },
      { path: 'gradebook', element: <GradebookPage /> },
      { path: 'gradebook/:assessmentId', element: <GradeEntryPage /> },
      { path: 'grades', element: <StudentGradesPage /> },
      { path: 'homework', element: <HomeworkPage /> },
      { path: 'homework/:id', element: <SubmissionPage /> },
      { path: 'messages', element: <MessagesPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'community', element: <DirectoryPage /> },
      { path: 'documents', element: <DocumentsPage /> },
      { path: 'forms', element: <FormsListPage /> },
      { path: 'forms/new', element: <FormBuilderPage /> },
      { path: 'forms/:id/fill', element: <FormFillPage /> },
      { path: 'forms/:id/results', element: <FormResultsPage /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/login" replace /> },
]);
