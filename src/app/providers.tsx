
'use client';

import { AuthProvider } from '@/components/auth-provider';
import { ProfileProvider } from '@/components/profile-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { AddBillTransactionModalProvider } from '@/contexts/AddBillTransactionModalContext';
import { AddTransactionModalProvider } from '@/contexts/AddTransactionModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AddBillTransactionModalProvider>
          <AddTransactionModalProvider>
            <AppLayout>{children}</AppLayout>
          </AddTransactionModalProvider>
        </AddBillTransactionModalProvider>
        <Toaster />
      </ProfileProvider>
    </AuthProvider>
  );
}
