import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HubLandingPage } from '../features/landing/pages/HubLandingPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { SignupPage } from '../features/auth/pages/SignupPage';
import { CatalogPage } from '../features/catalog/pages/CatalogPage';
import { PlatformsPage } from '../features/catalog/pages/PlatformsPage';
import { CourseDetailPage } from '../features/course/pages/CourseDetailPage';
import { CertificatesPage } from '../features/certificates/pages/CertificatesPage';
import { PortfolioPage } from '../features/portfolio/pages/PortfolioPage';
import { CurriculumPage } from '../features/curriculum/pages/CurriculumPage';
import { DashboardPage } from '../features/dashboard/pages/DashboardPage';

export const router = createBrowserRouter([
  // Public
  { path: '/', element: <HubLandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/courses', element: <CatalogPage /> },
  { path: '/courses/:id', element: <CourseDetailPage /> },
  { path: '/platforms', element: <PlatformsPage /> },
  { path: '/curriculum', element: <CurriculumPage /> },

  // Authenticated (placeholder)
  { path: '/dashboard', element: <DashboardPage /> },
  { path: '/certificates', element: <CertificatesPage /> },
  { path: '/portfolio', element: <PortfolioPage /> },

  // Catch-all
  { path: '*', element: <Navigate to="/" replace /> },
]);
