'use client';
import React from 'react';
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
import { Menu, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAddIncomeModal } from '@/contexts/AddIncomeModalContext';
import AddIncomeForm from '../dashboard/add-income-form';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isFormOpen: isExpenseFormOpen, setIsFormOpen: setIsExpenseFormOpen } = useAddExpenseModal();
  const { isFormOpen: isIncomeFormOpen, setIsFormOpen: setIsIncomeFormOpen } = useAddIncomeModal();
  const isMobile = useIsMobile();

  if (!user) {
    return (
      <div className="min-h-screen bg-background font-sans antialiased">
        <Header />
        <main className="flex flex-1 justify-center items-center h-[calc(100vh-56px)]">
          {children}
        </main>
      </div>
    );
  }

  // Main layout for logged-in users
  return (
    <Sheet>
      <div className="min-h-screen bg-background font-sans antialiased">
        <Header
          menuTrigger={isMobile ? (
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 rounded-full">
                <Menu className="h-4 w-4 text-muted-foreground" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
          ) : undefined
          }
        />
        <div className="flex">
          {isMobile ? (
            <SheetContent side="left" className="p-0 w-[80px]">
              <SidebarNav />
            </SheetContent>
          ) : (
            <div className="w-[80px] border-r h-[calc(100vh-56px)]">
              <SidebarNav />
            </div>
          )}
        
          <main className="flex-1 p-4 sm:p-6 md:p-8 h-[calc(100vh-56px)] overflow-auto border-t">{children}</main>
        </div>

        <div className="fixed bottom-6 right-6 flex flex-col gap-2">
          <Button
            onClick={() => setIsIncomeFormOpen(true)}
            size="icon"
            className="rounded-full bg-green-500 text-white hover:bg-green-600 h-12 w-12"
          >
            <ArrowUpRight className="h-6 w-6" />
          </Button>
          <Button
            onClick={() => setIsExpenseFormOpen(true)}
            size="icon"
            className="rounded-full bg-red-500 text-white hover:bg-red-600 h-12 w-12"
          >
            <ArrowDownLeft className="h-6 w-6" />
          </Button>
        </div>

        <AddExpenseForm
          isOpen={isExpenseFormOpen}
          onOpenChange={setIsExpenseFormOpen}
        />

        <AddIncomeForm
          isOpen={isIncomeFormOpen}
          onOpenChange={setIsIncomeFormOpen}
        />
      </div>
    </Sheet>
  );
}
