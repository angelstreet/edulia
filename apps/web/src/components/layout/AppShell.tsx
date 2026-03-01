import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-60 max-md:ml-0">
        <Topbar />
        <main className="flex-1 p-6 max-md:pb-20">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
