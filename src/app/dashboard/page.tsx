'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { text } from '@/lib/strings';

// The Dashboard page now only displays the content.
// The AddExpenseForm and its trigger are handled by the AppLayout and Sidebar.

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Redirect to home if user is not authenticated after loading is complete.
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  // Display a loading spinner while checking authentication.
  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Main dashboard content.
  return (
    <div className="container mx-auto flex flex-col items-center text-center p-4 sm:p-6 md:p-8">
      <div className="mb-8">
        <p className="text-muted-foreground">{text.summary.totalBalance}</p>
        <p className="text-4xl font-bold">R$ 0,00</p>
      </div>

      {/* 
        The buttons for navigation and adding a new transaction 
        have been moved to the sidebar and are handled by 
        AppLayout.tsx and menu-items.tsx.
      */}
    </div>
  );
}
