'use client';

import { text } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import { Shield, PlusCircle, CreditCard } from 'lucide-react';
import EmergencyReserveList from '@/components/lancamentos/emergency-reserve-list';
import { useState } from 'react';
import AddReserveEntryForm from '@/components/reserva-de-emergencia/add-reserve-entry-form';
import { useAddBillTransactionModal } from '@/contexts/AddBillTransactionModalContext';
import BillPaymentsList from '@/components/faturas/bill-payments-list';
import TransactionList from '@/components/lancamentos/TransactionList';
import { useTransactions } from '@/hooks/use-transactions';
import { useProfile } from '@/hooks/use-profile';

export default function LancamentosPage() {
  const { openForm: openTransactionForm } = useAddTransactionModal();
  const [isReserveFormOpen, setIsReserveFormOpen] = useState(false);
  const { openModal } = useAddBillTransactionModal();
  const { activeProfile } = useProfile();
  const { expenses, incomes, loading } = useTransactions(activeProfile);

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
              onClick={() => openModal('pay')}
              size="sm"
              variant="outline"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              Movimentar Fatura
            </Button>
            <Button
              onClick={openTransactionForm}
              size="sm"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Novo Lançamento
            </Button>
          </div>
        </div>
        <div className="space-y-6">
          <TransactionList
            type="expense"
            transactions={expenses}
            loading={loading}
          />
          <TransactionList
            type="income"
            transactions={incomes}
            loading={loading}
          />
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
