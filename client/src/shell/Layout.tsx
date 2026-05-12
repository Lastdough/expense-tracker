import { Outlet } from 'react-router-dom';
import { SideRail } from './SideRail';
import { BottomTabs } from './BottomTabs';

export function Layout() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="flex min-h-screen">
        <SideRail className="hidden md:flex" />
        <main className="flex-1 min-w-0 pb-20 md:pb-0 flex flex-col">
          <Outlet />
        </main>
      </div>
      <BottomTabs className="md:hidden" />
    </div>
  );
}
