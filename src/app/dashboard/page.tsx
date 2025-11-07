
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  Calculator,
  Beef,
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
import FinancialChart from '@/components/dashboard/FinancialChart';
import { useProfile } from '@/hooks/use-profile';
import { Transaction, BillPayment } from '@/lib/types';
import { getYear, getMonth } from 'date-fns';
import SumExpensesForm from '@/components/dashboard/sum-expenses-form';
import { useAddTransactionModal } from '@/contexts/AddTransactionModalContext';
import SplitAddButton from '@/components/dashboard/SplitAddButton';
import { useTransactions } from '@/hooks/use-transactions';

const months = Object.entries(text.dashboard.months).map(([key, label], index) => ({
  value: index,
  label: label,
}));

const currentYear = new Date().getFullYear();

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { activeProfile } = useProfile();
  const router = useRouter();
  const { setIsFormOpen } = useAddTransactionModal();
  const [isSumFormOpen, setIsSumFormOpen] = useState(false);

  const { incomes, expenses, billPayments, loading: transactionsLoading } = useTransactions(activeProfile);

  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalVendas, setTotalVendas] = useState(0);
  const [totalAlimentacao, setTotalAlimentacao] = useState(0);

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
    if (transactionsLoading) return;

    const allTransactions = [...incomes, ...expenses, ...billPayments];
    if (allTransactions.length > 0) {
      const yearsWithData = new Set(
        allTransactions
          .map((t) => (t.date ? getYear((t.date as unknown as Timestamp).toDate()) : null))
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

    const filterByMonthAndYear = (t: Omit<Transaction | BillPayment, 'id'>) => {
      if (!t.date) return false;
      const date = (t.date as unknown as Timestamp).toDate();
      return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
    };

    const monthlyIncomes = incomes
      .filter(filterByMonthAndYear)
      .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthlyVendas = incomes
      .filter(filterByMonthAndYear)
      .filter(income => income.subcategory === text.businessCategories.pfpbSubcategory)
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    const monthlyAlimentacao = expenses
      .filter(filterByMonthAndYear)
      .filter(expense => expense.mainCategory === 'Alimentação')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthlyNonCardExpenses = expenses
      .filter(filterByMonthAndYear)
      .filter(e => !e.paymentMethod.startsWith('Cartão:'))
      .reduce((acc, curr) => acc + curr.amount, 0);
    
    // Only 'payment' type bill payments are considered expenses for the dashboard
    const monthlyBillPayments = billPayments
      .filter(filterByMonthAndYear)
      .filter(p => p.type === 'payment')
      .reduce((acc, curr) => acc + curr.amount, 0);

    const totalMonthlyExpenses = monthlyNonCardExpenses + monthlyBillPayments;

    setTotalIncomes(monthlyIncomes);
    setTotalExpenses(totalMonthlyExpenses);
    setTotalVendas(monthlyVendas);
    setTotalAlimentacao(monthlyAlimentacao);
    setTotalBalance(monthlyIncomes - totalMonthlyExpenses);
  }, [incomes, expenses, billPayments, transactionsLoading, selectedYear, selectedMonth, activeProfile]);


  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  const loading = authLoading || transactionsLoading;

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
          <div className="flex items-center gap-2">
            {(activeProfile === 'Home' || activeProfile === 'Business') && (
              <Button
                onClick={() => setIsSumFormOpen(true)}
                size="icon"
                variant="outline"
                className="h-10 w-10 rounded-full"
              >
                <Calculator className="h-5 w-5" />
              </Button>
            )}
            <SplitAddButton onOpen={() => setIsFormOpen(true)} />
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
                    ({months.find((m) => m.value === selectedMonth)?.label} de{' '}
                    {selectedYear})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                {loading ? (
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
             {activeProfile === 'Business' && (
              <Card className="mt-6">
                 <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {text.dashboard.pfpbProgram}
                     <span className="text-xs font-normal text-muted-foreground">
                        ({months.find((m) => m.value === selectedMonth)?.label} de{' '}
                        {selectedYear})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                   {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                            <Receipt className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {text.dashboard.totalCredits}
                            </p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(totalVendas)}
                            </p>
                        </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
             {activeProfile === 'Home' && (
              <Card className="mt-6">
                 <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {text.dashboard.food}
                     <span className="text-xs font-normal text-muted-foreground">
                        ({months.find((m) => m.value === selectedMonth)?.label} de{' '}
                        {selectedYear})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                   {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                            <Beef className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">
                                {text.dashboard.totalFood}
                            </p>
                            <p className="text-lg font-semibold">
                                {formatCurrency(totalAlimentacao)}
                            </p>
                        </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

      </div>
      {(activeProfile === 'Home' || activeProfile === 'Business') && (
        <SumExpensesForm
          isOpen={isSumFormOpen}
          onOpenChange={setIsSumFormOpen}
        />
      )}
    </>
  );
}
