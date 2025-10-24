'use client';
import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';

import Header from '@/components/header';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import SidebarNav from './SidebarNav';
import { Button } from '@/components/ui/button';
import {
  Sheet, 
  SheetContent, 
  SheetTrigger
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isFormOpen, setIsFormOpen } = useAddExpenseModal();
  const [isSheetOpen, setIsSheetOpen] = useState(false); // State for the navigation sheet

  // If no user, render the children in a basic layout (e.g., for login page)
  if (!user) {
    return (
      <div className="min-h-screen bg-background font-sans antialiased">
        <Header />
        <main className="h-full flex-1 overflow-auto">{children}</main>
      </div>
    );
  }

  // Main layout for logged-in users
  return (
    <div className="min-h-screen bg-background font-sans antialiased">
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <Header
          menuTrigger={
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <Menu className="h-5 w-5 text-muted-foreground" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
          }
        />
        <SheetContent side="left" className="p-0 w-[250px] sm:w-[300px]">
          <SidebarNav onSheetClose={() => setIsSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      <main className="h-full flex-1 overflow-auto">{children}</main>

      {/* The modal for adding an expense is now managed by context */}
      <AddExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
      />
    </div>
  );
}
