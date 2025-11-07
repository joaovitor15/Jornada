'use client';

import ExpensesList from '@/components/dashboard/expenses-list';
import IncomeList from '@/components/dashboard/income-list';
import BillPaymentsList from '@/components/faturas/bill-payments-list';
import { Button } from '@/components/ui/button';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import { text } from '@/lib/strings';
import { Shield, PlusCircle, CreditCard, Undo2 } from 'lucide-react';
import EmergencyReserveList from '@/components/lancamentos/emergency-reserve-list';
import { useState } from 'react';
import AddReserveEntryForm from '@/components/reserva-de-emergencia/add-reserve-entry-form';
import { useAddBillTransactionModal } from '@/contexts/AddBillTransactionModalContext';

export default function LancamentosPage() {
  const { setIsFormOpen: setIsTransactionFormOpen } = useAddTransactionModal();
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);
  const { openModal } = useAddBillTransactionModal();

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{text.sidebar.releases}</h1>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsReserveFormOpen(true)}
              size="sm"
              variant="outline"
            >
              <Shield className="mr-2 h-4 w-4" />
              Movimentar Reserva
            </Button>
            <Button
              onClick={() => openModal('pay', 'anticipate')}
              size="sm"
              variant="outline"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pgto Antecipado
            </Button>
             <Button
              onClick={() => openModal('pay', 'refund')}
              size="sm"
              variant="outline"
            >
              <Undo2 className="mr-2 h-4 w-4" />
              Estornar
            </Button>
            <Button
              onClick={() => openModal('pay', 'payment')}
              size="sm"
              variant="outline"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Pagar Fatura
            </Button>
            <Button
              onClick={() => setIsTransactionFormOpen(true)}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Lançamento
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <ExpensesList />
          <IncomeList />
          <BillPaymentsList />
          <EmergencyReserveList />
        </div>
      </div>
      <AddReserveEntryForm
        isOpen={isReserveFormOpen}
        onOpenChange={setIsReserveFormOpen}
      />
    </>
  );
}
