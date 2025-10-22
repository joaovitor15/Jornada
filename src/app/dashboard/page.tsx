'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2 } from 'lucide-react';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import ExpensesList from '@/components/dashboard/expenses-list';
import { text } from '@/lib/strings';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
       <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold font-headline">{text.myExpenses}</h1>
        <Button
          onClick={() => setIsFormOpen(true)}
          style={{
            backgroundColor: 'hsl(var(--accent))',
            color: 'hsl(var(--accent-foreground))',
          }}
        >
          <PlusCircle className="mr-2 h-4 w-4" /> {text.addExpense}
        </Button>
      </div>

      <AddExpenseForm isOpen={isFormOpen} onOpenChange={setIsFormOpen} />

      <ExpensesList />
    </div>
  );
}
