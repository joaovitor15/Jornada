'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { text } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import AddIncomeForm from '@/components/dashboard/add-income-form';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import FinancialChart from '@/components/dashboard/FinancialChart';
import CategoryChart from '@/components/dashboard/CategoryChart';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user) {
      setLoadingBalance(false);
      return;
    }

    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', user.uid));
    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid));

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        setLoadingBalance(true);
        const incomes = incomesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Transaction[];
        const expenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as Transaction[];

        const filteredIncomes = incomes.filter(t => t.profile === activeProfile);
        const filteredExpenses = expenses.filter(t => t.profile === activeProfile);

        const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
        const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);

        setTotalBalance(totalIncome - totalExpense);
        setLoadingBalance(false);
      });
      return () => unsubscribeExpenses();
    });

    return () => unsubscribeIncomes();
  }, [user, activeProfile]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <FinancialChart />
          </div>
          <div>
            <CategoryChart />
          </div>
        </div>
        <div className="flex justify-center items-center gap-4 mt-8">
          <div>
            <p className="text-muted-foreground">{text.summary.totalBalance}</p>
            {loadingBalance ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <p className="text-4xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBalance)}
              </p>
            )}
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
