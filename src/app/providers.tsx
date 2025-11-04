
'use client';

import { AuthProvider } from '@/components/auth-provider';
import { ProfileProvider } from '@/components/profile-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { AddPayBillModalProvider } from '@/contexts/AddPayBillModalContext';
import { AddTransactionModalProvider } from '@/contexts/AddTransactionModalContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProfileProvider>
        <AddPayBillModalProvider>
          <AddTransactionModalProvider>
            <AppLayout>{children}</AppLayout>
          </AddTransactionModalProvider>
        </AddPayBillModalProvider>
        <Toaster />
      </ProfileProvider>
    </AuthProvider>
  );
}
