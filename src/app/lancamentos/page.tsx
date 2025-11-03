'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import IncomeList from '@/components/dashboard/income-list';
import BillPaymentsList from '@/components/faturas/bill-payments-list';
import { Button } from '@/components/ui/button';
import { useAddExpenseModal } from '@/contexts/AddExpenseModalContext';
import { useAddIncomeModal } from '@/contexts/AddIncomeModalContext';
import { text } from '@/lib/strings';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export default function LancamentosPage() {
  const { setIsFormOpen: setIsExpenseFormOpen } = useAddExpenseModal();
  const { setIsFormOpen: setIsIncomeFormOpen } = useAddIncomeModal();

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{text.sidebar.releases}</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsIncomeFormOpen(true)}
            size="sm"
            className="bg-green-500 text-white hover:bg-green-600"
          >
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {text.summary.newIncome}
          </Button>
          <Button
            onClick={() => setIsExpenseFormOpen(true)}
            size="sm"
            className="bg-red-500 text-white hover:bg-red-600"
          >
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            {text.summary.newTransaction}
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        <ExpensesList />
        <IncomeList />
        <BillPaymentsList />
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="item-1" className="border-b-0">
            <AccordionTrigger className="bg-card border rounded-lg shadow-sm px-6 py-4 w-full text-lg font-semibold flex justify-between items-center hover:no-underline">
              {text.sidebar.emergencyReserve}
            </AccordionTrigger>
            <AccordionContent>
              <div className="text-center text-muted-foreground py-10">
                {text.common.comingSoon}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}
