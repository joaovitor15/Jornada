'use client';
import React, { useState, useEffect } from 'react';
import { useProfile } from '@/hooks/use-profile';
import {
  personalCategories,
  homeCategories,
  businessCategories,
  type ExpenseCategory,
} from '@/lib/types';

import { MenuItems } from './menu-items';
import {
  Sidebar,
  SidebarProvider,
  SidebarHeader,
  SidebarHeaderLogo,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import { useProfile } from '@/hooks/use-profile';
import { 
  personalCategories,
  homeCategories,
  businessCategories,
  type ExpenseCategory,
} from '@/lib/types';
import { text } from '@/lib/strings';
import Link from 'next/link';
import { Wallet } from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarHeaderLogo>{text.header.appName}</SidebarHeaderLogo>
          <SidebarTrigger />
        </SidebarHeader>

        <SidebarContent>
          {/* Pass the function to open the modal to the menu items */}
          <MenuItems onAddExpenseClick={() => setIsFormOpen(true)} />
        </SidebarContent>

        <SidebarFooter>{/* Optional: Settings, Logout */}</SidebarFooter>
      </Sidebar>

      <main className="h-full flex-1 overflow-auto">{children}</main>

      {/* Render the modal at the layout level */}
      <AddExpenseForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        categories={currentCategories}
      />
    </SidebarProvider>
  );
}
