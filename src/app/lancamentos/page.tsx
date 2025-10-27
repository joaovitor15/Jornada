'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import IncomeList from '@/components/dashboard/income-list';
import { Button } from '@/components/ui/button';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import { useAddIncomeModal } from '@/contexts/AddIncomeModalContext';
import { text } from '@/lib/strings';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

export default function LancamentosPage() {
  const { setIsFormOpen: setIsExpenseFormOpen } = useAddExpenseModal();
  const { setIsFormOpen: setIsIncomeFormOpen } = useAddIncomeModal();

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{text.dashboard.title}</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsIncomeFormOpen(true)}
            className="bg-green-500 text-white hover:bg-green-600"
          >
            <ArrowUpRight className="mr-2 h-5 w-5" />
            {text.summary.newIncome}
          </Button>
          <Button
            onClick={() => setIsExpenseFormOpen(true)}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            <ArrowDownLeft className="mr-2 h-5 w-5" />
            {text.summary.newTransaction}
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        <ExpensesList />
        <IncomeList />
      </div>
    </div>
  );
}
