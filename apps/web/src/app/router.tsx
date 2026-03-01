import { createBrowserRouter, Navigate } from 'react-router-dom';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { AcceptInvitePage } from '../features/auth/pages/AcceptInvitePage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';
import { UsersPage } from '../features/admin/pages/UsersPage';
import { SettingsPage } from '../features/settings/pages/SettingsPage';
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
      { path: 'settings', element: <SettingsPage /> },
    ],
  },

  // Catch-all
  { path: '*', element: <Navigate to="/login" replace /> },
]);
