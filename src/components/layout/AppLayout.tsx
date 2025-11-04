
'use client';
import React from 'react';
import { useAuth } from '@/hooks/use-auth';
import Header from '@/components/header';
import SidebarNav from './SidebarNav';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAddPayBillModal } from '@/contexts/AddPayBillModalContext';
import PayBillForm from '../faturas/pay-bill-form';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import AddTransactionForm from '../lancamentos/add-transaction-form';


export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { isFormOpen: isPayBillFormOpen, setIsFormOpen: setIsPayBillFormOpen } = useAddPayBillModal();
  const { isFormOpen: isTransactionFormOpen, setIsFormOpen: setIsTransactionFormOpen } = useAddTransactionModal();
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
        
        <PayBillForm
          isOpen={isPayBillFormOpen}
          onOpenChange={setIsPayBillFormOpen}
        />

        <AddTransactionForm
          isOpen={isTransactionFormOpen}
          onOpenChange={setIsTransactionFormOpen}
        />

      </div>
    </Sheet>
  );
}
