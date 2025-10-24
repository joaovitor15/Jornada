'use client';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { usePathname } from 'next/navigation';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import { Button } from '@/components/ui/button';
import { SheetClose } from '@/components/ui/sheet';
import {
  UserCircle,
  LayoutDashboard,
  List,
  Power,
} from 'lucide-react';
import { text } from '@/lib/strings';

interface SidebarNavProps {
  onSheetClose: () => void; // Function to close the sheet
}

export default function SidebarNav({ onSheetClose }: SidebarNavProps) {
  const { user, signOut } = useAuth();
  const { setIsFormOpen } = useAddExpenseModal();
  const pathname = usePathname();
  const userName = user?.email?.split('@')[0] || 'User';

  const handleLogout = () => {
    signOut();
    onSheetClose(); // Close sheet on logout
  };

  const handleAddExpense = () => {
    setIsFormOpen(true);
    onSheetClose(); // Close sheet when opening the form
  };

  const navLinks = [
    {
      href: '/dashboard',
      label: text.sidebar.dashboard,
      icon: LayoutDashboard,
    },
    {
      href: '/lancamentos',
      label: text.sidebar.releases,
      icon: List,
    },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center gap-3">
          <UserCircle className="h-10 w-10 text-muted-foreground" />
          <div className="flex flex-col">
            <span className="font-semibold capitalize">{userName}</span>
          </div>
        </div>
      </div>

      {/* Content */}
        <nav className="flex flex-col gap-1">
          {navLinks.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link href={link.href}>
                <Button
                  variant={pathname === link.href ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  size="lg"
                >
                  <link.icon className="mr-2 h-5 w-5" />
                  {link.label}
                </Button>
              </Link>
            </SheetClose>
          ))}
        </nav>
     
      {/* Footer */}
      <div className="mt-auto border-t p-4">
        <Button 
          onClick={handleLogout} 
          variant="ghost" 
          size="icon"
          className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Sair"
        >
          <Power className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
