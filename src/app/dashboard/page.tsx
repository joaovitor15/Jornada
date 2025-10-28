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
  TrendingUp,
  TrendingDown,
  Wallet,
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
import { getYear, getMonth } from 'date-fns';

const months = Object.entries(text.dashboard.months).map(([key, label], index) => ({
  value: index,
  label: label,
}));

const currentYear = new Date().getFullYear();

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const [isIncomeFormOpen, setIsIncomeFormOpen] = useState(false);
  const [isExpenseFormOpen, setIsExpenseFormOpen] = useState(false);
  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoadingBalance(false);
      return;
    }

    setLoadingBalance(true);

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile)
      );

    const incomesQuery = baseQuery('incomes');
    const expensesQuery = baseQuery('expenses');

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const incomes = incomesSnapshot.docs.map((doc) => ({
        ...(doc.data() as Omit<Transaction, 'id'>),
        id: doc.id,
      }));

      const unsubscribeExpenses = onSnapshot(
        expensesQuery,
        (expensesSnapshot) => {
          const expenses = expensesSnapshot.docs.map((doc) => ({
            ...(doc.data() as Omit<Transaction, 'id'>),
            id: doc.id,
          }));

          const allTransactions = [...incomes, ...expenses];
          if (allTransactions.length > 0) {
            const yearsWithData = new Set(
              allTransactions
                .map((t) =>
                  t.date ? getYear((t.date as unknown as Timestamp).toDate()) : null
                )
                .filter(Boolean) as number[]
            );
            const sortedYears = Array.from(yearsWithData).sort((a, b) => b - a);
            if (sortedYears.length > 0) {
              setAvailableYears(sortedYears);
              if (!yearsWithData.has(selectedYear)) {
                setSelectedYear(sortedYears[0]);
              }
            }
          } else {
            setAvailableYears([currentYear]);
          }

          const filterByMonthAndYear = (t: Omit<Transaction, 'id'>) => {
            if (!t.date) return false;
            const date = (t.date as unknown as Timestamp).toDate();
            return (
              getYear(date) === selectedYear && getMonth(date) === selectedMonth
            );
          };

          const monthlyIncomes = incomes
            .filter(filterByMonthAndYear)
            .reduce((acc, curr) => acc + curr.amount, 0);
          const monthlyExpenses = expenses
            .filter(filterByMonthAndYear)
            .reduce((acc, curr) => acc + curr.amount, 0);

          setTotalIncomes(monthlyIncomes);
          setTotalExpenses(monthlyExpenses);
          setTotalBalance(monthlyIncomes - monthlyExpenses);
          setLoadingBalance(false);
        }
      );

      return () => unsubscribeExpenses();
    });

    return () => unsubscribeIncomes();
  }, [user, activeProfile, selectedYear, selectedMonth, router]);

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

  return (
    <>
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">
                {text.dashboard.monthLabel}
              </label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={text.dashboard.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={String(month.value)}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">
                {text.dashboard.yearLabel}
              </label>
              <Select
                value={String(selectedYear)}
                onValueChange={(value) => setSelectedYear(Number(value))}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder={text.dashboard.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {availableYears.map((year) => (
                    <SelectItem key={year} value={String(year)}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsExpenseFormOpen(true)}
              size="icon"
              className="h-10 w-10 rounded-full bg-red-500 text-white hover:bg-red-600"
            >
              <ArrowDownLeft className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => setIsIncomeFormOpen(true)}
              size="icon"
              className="h-10 w-10 rounded-full bg-green-500 text-white hover:bg-green-600"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>{text.dashboard.annualSummaryTitle}</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <FinancialChart
                  year={selectedYear}
                  onMonthSelect={setSelectedMonth}
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
                    ({months.find((m) => m.value === selectedMonth)?.label} de {' '}
                    {selectedYear})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                {loadingBalance ? (
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                ) : (
                  <div className="flex flex-col items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                        <TrendingUp className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {text.summary.income}
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(totalIncomes)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                        <TrendingDown className="h-6 w-6 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {text.summary.expenses}
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(totalExpenses)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                        <Wallet className="h-6 w-6 text-gray-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          {text.summary.totalBalance}
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(totalBalance)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
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
