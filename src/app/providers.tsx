'use client';

import { AuthProvider } from '@/components/auth-provider';
import { ProfileProvider } from '@/components/profile-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { AddExpenseModalProvider } from '@/contexts/AddExpenseModalContext';
import { AddIncomeModalProvider } from '@/contexts/AddIncomeModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AddExpenseModalProvider>
          <AddIncomeModalProvider>
            <AppLayout>{children}</AppLayout>
          </AddIncomeModalProvider>
        </AddExpenseModalProvider>
        <Toaster />
      </ProfileProvider>
    </AuthProvider>
  );
}
