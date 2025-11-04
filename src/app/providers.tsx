'use client';

import { AuthProvider } from '@/components/auth-provider';
import { ProfileProvider } from '@/components/profile-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { AddExpenseModalProvider } from '@/contexts/AddExpenseModalContext';
import { AddIncomeModalProvider } from '@/contexts/AddIncomeModalContext';
import { AddPayBillModalProvider } from '@/contexts/AddPayBillModalContext';
import { AddTransactionModalProvider } from '@/contexts/AddTransactionModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AddExpenseModalProvider>
          <AddIncomeModalProvider>
            <AddPayBillModalProvider>
              <AddTransactionModalProvider>
                <AppLayout>{children}</AppLayout>
              </AddTransactionModalProvider>
            </AddPayBillModalProvider>
          </AddIncomeModalProvider>
        </AddExpenseModalProvider>
        <Toaster />
      </ProfileProvider>
    </AuthProvider>
  );
}
