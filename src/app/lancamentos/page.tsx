'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import IncomeList from '@/components/dashboard/income-list';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import { useAddIncomeModal } from '@/contexts/AddIncomeModalContext';
import { text } from '@/lib/strings';

export default function LancamentosPage() {
  const { setIsFormOpen: setIsExpenseFormOpen } = useAddExpenseModal();
  const { setIsFormOpen: setIsIncomeFormOpen } = useAddIncomeModal();

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">{text.dashboard.title}</h1>
        <div className="flex gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsIncomeFormOpen(true)}
                  size="icon"
                  className="rounded-full bg-green-500 text-white hover:bg-green-600"
                  aria-label={text.summary.newIncome}
                >
                  <span className="text-xl">▲</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{text.summary.newIncome}</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => setIsExpenseFormOpen(true)}
                  size="icon"
                  className="rounded-full bg-red-500 text-white hover:bg-red-600"
                  aria-label={text.summary.newTransaction}
                >
                  <span className="text-xl">▼</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{text.summary.newTransaction}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <div className="space-y-6">
        <ExpensesList />
        <IncomeList />
      </div>
    </div>
  );
}
