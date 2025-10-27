'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { text } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import AddIncomeForm from '@/components/dashboard/add-income-form';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import FinancialChart from '@/components/dashboard/FinancialChart';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);

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
    <>
      <div className="container mx-auto flex flex-col items-center text-center p-4 sm:p-6 md:p-8">
        <div className="flex items-center gap-4 mb-8">
          <div>
            <p className="text-muted-foreground">{text.summary.totalBalance}</p>
            <p className="text-4xl font-bold">R$ 0,00</p>
          </div>
          <div className="flex gap-2">
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
        </div>
        <FinancialChart />
      </div>
      <AddIncomeForm
        isOpen={isIncomeFormOpen}
        onOpenChange={setIsIncomeFormOpen}
      />
      <AddExpenseForm
        isOpen={isExpenseFormOpen}
        onOpenChange={setIsExpenseFormOpen}
      />
    </>
  );
}
