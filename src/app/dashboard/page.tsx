
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
  HeartPulse,
  Salad,
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
import FaturasAtuais from '@/components/dashboard/FaturasAtuais';
import { useTags } from '@/hooks/use-tags';

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
  const { hierarchicalTags } = useTags();

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );

  const { incomes, expenses, billPayments, loading: transactionsLoading, availableYears } = useTransactions(activeProfile, { year: selectedYear, month: selectedMonth });

  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncomes, setTotalIncomes] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalFarmaciaPopular, setTotalFarmaciaPopular] = useState(0);
  const [totalAlimentacao, setTotalAlimentacao] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (transactionsLoading) return;

    const monthlyNonCardExpenses = expenses
      .filter((e) => !e.paymentMethod?.startsWith('Cartão:'))
      .reduce((acc, curr) => acc + curr.amount, 0);

    const monthlyBillPayments = billPayments.reduce((acc, curr) => acc + curr.amount, 0);

    const totalMonthlyExpenses = monthlyNonCardExpenses + monthlyBillPayments;

    const monthlyIncomes = incomes
        .filter(income => !(activeProfile === 'Business' && income.tags?.includes('Vendas Farmácia Popular')))
        .reduce((acc, curr) => acc + curr.amount, 0);
        
    if (activeProfile === 'Business') {
      const farmaciaPopularIncomes = incomes
        .filter(income => income.tags?.includes('Vendas Farmácia Popular'))
        .reduce((acc, curr) => acc + curr.amount, 0);
      setTotalFarmaciaPopular(farmaciaPopularIncomes);
    } else {
      setTotalFarmaciaPopular(0);
    }
    
    if (activeProfile === 'Home') {
        const alimentacaoTag = hierarchicalTags.find(tag => tag.name === 'Alimentação');
        const alimentacaoSubTagNames = alimentacaoTag?.children.map(child => child.name) || [];
        const alimentacaoExpenses = expenses
            .filter(expense => 
                expense.tags?.some(tag => alimentacaoSubTagNames.includes(tag))
            )
            .reduce((acc, curr) => acc + curr.amount, 0);
        setTotalAlimentacao(alimentacaoExpenses);
    } else {
        setTotalAlimentacao(0);
    }

    setTotalIncomes(monthlyIncomes);
    setTotalExpenses(totalMonthlyExpenses);
    setTotalBalance(monthlyIncomes - totalMonthlyExpenses);

  }, [incomes, expenses, billPayments, transactionsLoading, activeProfile, hierarchicalTags]);
  
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
          <div className="lg:col-span-1 space-y-6">
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

            {activeProfile === 'Home' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Alimentação
                    <span className="text-xs font-normal text-muted-foreground">
                      ({months.find((m) => m.value === selectedMonth)?.label} de{' '}
                      {selectedYear})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center gap-4 py-10">
                   {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                        <Salad className="h-6 w-6 text-yellow-600" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Gasto
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

            {activeProfile === 'Business' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Programa Farmácia Popular
                    <span className="text-xs font-normal text-muted-foreground">
                      ({months.find((m) => m.value === selectedMonth)?.label} de{' '}
                      {selectedYear})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center gap-4 py-10">
                   {loading ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                        <HeartPulse className="h-6 w-6 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Total Recebido
                        </p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(totalFarmaciaPopular)}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
        
        <FaturasAtuais />

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
