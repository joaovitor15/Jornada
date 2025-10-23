'use client';

import { useAuth } from '@/hooks/use-auth';
import { MenuItems } from './menu-items';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInput,
} from '@/components/ui/sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarInput placeholder="Search..." />
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent>
          <MenuItems />
        </SidebarContent>
        <SidebarFooter>
          {/* Add footer items here */}
        </SidebarFooter>
      </Sidebar>
      <main className="h-full flex-1 overflow-auto">{children}</main>
    </SidebarProvider>
  );
}
