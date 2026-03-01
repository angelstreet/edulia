import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { Breadcrumb } from './Breadcrumb';
import { MobileNav } from './MobileNav';

export function AppShell() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <Breadcrumb />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
