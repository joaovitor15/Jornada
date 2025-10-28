'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { text } from '@/lib/strings';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import AddIncomeForm from '@/components/dashboard/add-income-form';
import AddExpenseForm from '@/components/dashboard/add-expense-form';
import FinancialChart from '@/components/dashboard/FinancialChart';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { getYear, getMonth } from 'date-fns';

type TransactionTypeFilter = 'all' | 'income' | 'expense';

const months = [
  { value: 0, label: 'Janeiro' },
  { value: 1, label: 'Fevereiro' },
  { value: 2, label: 'Março' },
  { value: 3, label: 'Abril' },
  { value: 4, label: 'Maio' },
  { value: 5, label: 'Junho' },
  { value: 6, label: 'Julho' },
  { value: 7, label: 'Agosto' },
  { value: 8, label: 'Setembro' },
  { value: 9, label: 'Outubro' },
  { value: 10, label: 'Novembro' },
  { value: 11, label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionTypeFilter>('all');

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

    const incomesQuery = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid)
    );
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid)
    );

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const unsubscribeExpenses = onSnapshot(
        expensesQuery,
        (expensesSnapshot) => {
          setLoadingBalance(true);
          const incomes = incomesSnapshot.docs.map((doc) => ({
            ...(doc.data() as Omit<Transaction, 'id'>),
            id: doc.id,
          }));
          const expenses = expensesSnapshot.docs.map((doc) => ({
            ...(doc.data() as Omit<Transaction, 'id'>),
            id: doc.id,
          }));

          const filteredIncomes = incomes.filter((t) => {
            const date = (t.date as unknown as Timestamp).toDate();
            return (
              t.profile === activeProfile &&
              getYear(date) === selectedYear &&
              getMonth(date) === selectedMonth
            );
          });

          const filteredExpenses = expenses.filter((t) => {
            const date = (t.date as unknown as Timestamp).toDate();
            return (
              t.profile === activeProfile &&
              getYear(date) === selectedYear &&
              getMonth(date) === selectedMonth
            );
          });

          const totalIncome = filteredIncomes.reduce(
            (acc, curr) => acc + curr.amount,
            0
          );
          const totalExpense = filteredExpenses.reduce(
            (acc, curr) => acc + curr.amount,
            0
          );

          setTotalBalance(totalIncome - totalExpense);
          setLoadingBalance(false);
        }
      );
      return () => unsubscribeExpenses();
    });

    return () => unsubscribeIncomes();
  }, [user, activeProfile, selectedYear, selectedMonth]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="mb-6 flex flex-wrap items-center justify-start gap-x-6 gap-y-4">
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Mês</label>
                <Select
                    value={String(selectedMonth)}
                    onValueChange={(value) => setSelectedMonth(Number(value))}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                        {months.map(month => (
                            <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Ano</label>
                <Select
                    value={String(selectedYear)}
                    onValueChange={(value) => setSelectedYear(Number(value))}
                >
                    <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map(year => (
                            <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="flex items-center gap-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                    value={selectedTransactionType}
                    onValueChange={(value) => setSelectedTransactionType(value as TransactionTypeFilter)}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="income">Receitas</SelectItem>
                        <SelectItem value="expense">Despesas</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                  <CardTitle>Resumo Financeiro Anual</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <FinancialChart
                  year={selectedYear}
                  transactionType={selectedTransactionType}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {text.summary.totalBalance}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({months[selectedMonth].label} de {selectedYear})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
                  {loadingBalance ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <p className="text-3xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalBalance)}
                    </p>
                  )}
                <div className="flex gap-2">
                  <Button
                    onClick={() => setIsIncomeFormOpen(true)}
                    size="icon"
                    className="rounded-full bg-green-500 text-white hover:bg-green-600 h-10 w-10"
                  >
                    <ArrowUpRight className="h-5 w-5" />
                  </Button>
                  <Button
                    onClick={() => setIsIncomeFormOpen(true)}
                    size="icon"
                    className="rounded-full bg-red-500 text-white hover:bg-red-600 h-10 w-10"
                  >
                    <ArrowDownLeft className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
