
'use client';

import { AuthProvider } from '@/components/auth-provider';
import { ProfileProvider } from '@/components/profile-provider';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/AppLayout';
import { AddBillTransactionModalProvider } from '@/contexts/AddBillTransactionModalContext';
import { AddTransactionModalProvider } from '@/contexts/AddTransactionModalContext';
import { ThemeProvider } from '@/components/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
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
    </ThemeProvider>
  );
}
