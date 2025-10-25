'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import { Button } from '@/components/ui/button';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import { useAddIncomeModal } from '@/contexts/AddIncomeModalContext';
import { text } from '@/lib/strings';
import { PlusCircle } from 'lucide-react';

export default function LancamentosPage() {
  const { setIsFormOpen: setIsExpenseFormOpen } = useAddExpenseModal();
  const { setIsFormOpen: setIsIncomeFormOpen } = useAddIncomeModal();

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{text.dashboard.title}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsExpenseFormOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            {text.summary.newTransaction}
          </Button>
          <Button onClick={() => setIsIncomeFormOpen(true)} variant="outline">
            <PlusCircle className="mr-2 h-5 w-5" />
            {text.summary.newIncome}
          </Button>
        </div>
      </div>
      <ExpensesList />
    </div>
  );
}
