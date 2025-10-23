'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import {
  personalCategories,
  homeCategories,
  businessCategories,
  type ExpenseCategory,
} from '@/lib/types';

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
  const { activeProfile } = useProfile();
  const [currentCategories, setCurrentCategories] = useState<
    readonly ExpenseCategory[]
  >(personalCategories);

  useEffect(() => {
    // Sets the available expense categories based on the active profile
    switch (activeProfile) {
      case 'Personal':
        setCurrentCategories(personalCategories);
        break;
      case 'Home':
        setCurrentCategories(homeCategories);
        break;
      case 'Business':
        setCurrentCategories(businessCategories);
        break;
      default:
        setCurrentCategories(personalCategories);
    }
  }, [activeProfile]);

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
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
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
        categories={currentCategories}
      />
    </div>
  );
}
