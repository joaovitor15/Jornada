'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import IncomeList from '@/components/dashboard/income-list';
import VariableIncomeList from '@/components/dashboard/variable-income-list';
import { Button } from '@/components/ui/button';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import { text } from '@/lib/strings';
import { PlusCircle } from 'lucide-react';

export default function LancamentosPage() {
  const { setIsFormOpen: setIsExpenseFormOpen } = useAddExpenseModal();

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{text.dashboard.title}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setIsExpenseFormOpen(true)}>
            <PlusCircle className="mr-2 h-5 w-5" />
            {text.summary.newTransaction}
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        <ExpensesList />
        <IncomeList />
        <VariableIncomeList />
      </div>
    </div>
  );
}
