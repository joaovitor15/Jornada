'use client';

import { AuthProvider } from '@/components/auth-provider';
import { ProfileProvider } from '@/components/profile-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { AddExpenseModalProvider } from '@/contexts/AddExpenseModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AddExpenseModalProvider>
          <AppLayout>{children}</AppLayout>
        </AddExpenseModalProvider>
        <Toaster />
      </ProfileProvider>
    </AuthProvider>
  );
}
