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
import {
  Loader2,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
} from 'lucide-react';
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
import {
  subMonths,
  startOfYear,
  endOfYear,
  isWithinInterval,
  subYears,
} from 'date-fns';

type TimePeriod = 'last-12-months' | 'this-year' | 'last-year';
type TransactionTypeFilter = 'all' | 'income' | 'expense';

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [selectedTimePeriod, setSelectedTimePeriod] =
    useState<TimePeriod>('last-12-months');
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

          const now = new Date();
          let startDate: Date;
          if (selectedTimePeriod === 'last-12-months') {
            startDate = subMonths(now, 12);
          } else if (selectedTimePeriod === 'this-year') {
            startDate = startOfYear(now);
          } else {
            const lastYear = subYears(now, 1);
            startDate = startOfYear(lastYear);
          }
          const endDate =
            selectedTimePeriod === 'last-year' ? endOfYear(subYears(now, 1)) : now;

          const interval = { start: startDate, end: endDate };

          const filteredIncomes = incomes.filter(
            (t) =>
              t.profile === activeProfile &&
              isWithinInterval((t.date as unknown as Timestamp).toDate(), interval)
          );
          const filteredExpenses = expenses.filter(
            (t) =>
              t.profile === activeProfile &&
              isWithinInterval((t.date as unknown as Timestamp).toDate(), interval)
          );

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
  }, [user, activeProfile, selectedTimePeriod]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <div className="p-1">
        <div className="bg-card border rounded-lg shadow-sm p-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Período
                </label>
                <Select
                  value={selectedTimePeriod}
                  onValueChange={(value) => setSelectedTimePeriod(value as TimePeriod)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="last-12-months">
                      Últimos 12 meses
                    </SelectItem>
                    <SelectItem value="this-year">Este ano</SelectItem>
                    <SelectItem value="last-year">Ano passado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">
                  Tipo de Transação
                </label>
                <Select
                  value={selectedTransactionType}
                  onValueChange={(value) =>
                    setSelectedTransactionType(value as TransactionTypeFilter)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Receitas e Despesas</SelectItem>
                    <SelectItem value="income">Apenas Receitas</SelectItem>
                    <SelectItem value="expense">Apenas Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          <div className="lg:col-span-2">
            <Card className="h-full">
              <CardHeader>
                  <CardTitle>Resumo Financeiro Anual</CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-full">
                <FinancialChart
                  timePeriod={selectedTimePeriod}
                  transactionType={selectedTransactionType}
                />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1">
            <Card className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {text.summary.totalBalance}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({selectedTimePeriod === 'last-12-months' ? 'Últimos 12 meses' : selectedTimePeriod === 'this-year' ? 'Este ano' : 'Ano passado'})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4">
                <div>
                  {loadingBalance ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <p className="text-4xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(totalBalance)}
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
