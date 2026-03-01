import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { Toaster } from '@/components/ui/primitives/sonner';
import '../i18n';

export function AppProviders() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
