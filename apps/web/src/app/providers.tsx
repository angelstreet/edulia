import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import '../i18n';

export function AppProviders() {
  return <RouterProvider router={router} />;
}
