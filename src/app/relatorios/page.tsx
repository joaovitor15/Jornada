
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnnualFinancialChart from '@/components/relatorios/AnnualFinancialChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { text } from '@/lib/strings';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction, Income, BillPayment } from '@/lib/types';
import { getYear, getMonth } from 'date-fns';
import { CircleDollarSign, HelpCircle, Loader2, DollarSign, TrendingUp, Percent, Separator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const months = Object.entries(text.dashboard.months).map(([key, label], index) => ({
  value: index,
  label: label,
}));

const currentYear = new Date().getFullYear();

type ViewMode = 'monthly' | 'annual';

export default function ReportsPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [viewModeGrossProfit, setViewModeGrossProfit] = useState<ViewMode>('monthly');
  const [viewModeNetProfit, setViewModeNetProfit] = useState<ViewMode>('monthly');
  const [viewModeNetRevenue, setViewModeNetRevenue] = useState<ViewMode>('monthly');


  const [grossProfit, setGrossProfit] = useState(0);
  const [loadingGrossProfit, setLoadingGrossProfit] = useState(true);
  const [netProfit, setNetProfit] = useState(0);
  const [loadingNetProfit, setLoadingNetProfit] = useState(true);
  const [netRevenue, setNetRevenue] = useState(0);
  const [loadingNetRevenue, setLoadingNetRevenue] = useState(true);
  const [grossMargin, setGrossMargin] = useState(0);


 useEffect(() => {
    if (!user || !activeProfile) {
      return;
    }

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile)
      );

    const incomesQuery = baseQuery('incomes');
    const expensesQuery = baseQuery('expenses');

    const unsubIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
        const incomes = incomesSnapshot.docs.map(doc => doc.data() as Transaction);

        const unsubExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
            const expenses = expensesSnapshot.docs.map(doc => doc.data() as Transaction);
            const allTransactions = [...incomes, ...expenses];

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
        });
        return () => unsubExpenses();
    });

    return () => unsubIncomes();

  }, [user, activeProfile, selectedYear]);

  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setGrossProfit(0);
      setLoadingGrossProfit(false);
      return;
    }
    
    setLoadingGrossProfit(true);

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', 'Business')
      );

    const filterByPeriod = (t: Income | Transaction) => {
        const date = (t.date as unknown as Timestamp).toDate();
        if (viewModeGrossProfit === 'annual') {
            return getYear(date) === selectedYear;
        }
        return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
    }

    const unsubIncomes = onSnapshot(
        query(baseQuery('incomes'), where('mainCategory', '==', 'Vendas (Receitas)')), 
        (incomesSnap) => {
            const unsubExpenses = onSnapshot(
                query(baseQuery('expenses'), where('mainCategory', '==', 'Fornecedores')),
                (expensesSnap) => {
                    const sales = incomesSnap.docs
                        .map(doc => doc.data() as Income)
                        .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
                        .filter(filterByPeriod)
                        .reduce((acc, curr) => acc + curr.amount, 0);

                    const supplierPayments = expensesSnap.docs
                        .map(doc => doc.data() as Transaction)
                        .filter(filterByPeriod)
                        .reduce((acc, curr) => acc + curr.amount, 0);
                    
                    const calculatedGrossProfit = sales - supplierPayments;
                    setGrossProfit(calculatedGrossProfit);

                    // Re-use sales for netRevenue calculation to avoid re-querying
                    if (netRevenue > 0) {
                      setGrossMargin((calculatedGrossProfit / netRevenue) * 100);
                    } else {
                      setGrossMargin(0);
                    }
                    
                    setLoadingGrossProfit(false);
                }
            );
            return () => unsubExpenses();
        }
    );

    return () => unsubIncomes();

  }, [user, activeProfile, selectedYear, selectedMonth, viewModeGrossProfit, netRevenue]);

  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setNetRevenue(0);
      setLoadingNetRevenue(false);
      return;
    }
    
    setLoadingNetRevenue(true);

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', 'Business')
      );

    const filterByPeriod = (t: Income) => {
        const date = (t.date as unknown as Timestamp).toDate();
        if (viewModeNetRevenue === 'annual') {
            return getYear(date) === selectedYear;
        }
        return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
    }

    const unsubIncomes = onSnapshot(
        query(baseQuery('incomes'), where('mainCategory', '==', 'Vendas (Receitas)')), 
        (incomesSnap) => {
            const sales = incomesSnap.docs
                .map(doc => doc.data() as Income)
                .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
                .filter(filterByPeriod)
                .reduce((acc, curr) => acc + curr.amount, 0);
            
            setNetRevenue(sales);
            setLoadingNetRevenue(false);
        }
    );

    return () => unsubIncomes();

  }, [user, activeProfile, selectedYear, selectedMonth, viewModeNetRevenue]);

  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
        setNetProfit(0);
        setLoadingNetProfit(false);
        return;
    }

    setLoadingNetProfit(true);

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', 'Business')
      );

    const filterByPeriod = (t: Income | Transaction | BillPayment) => {
        const date = (t.date as unknown as Timestamp).toDate();
        if (viewModeNetProfit === 'annual') {
            return getYear(date) === selectedYear;
        }
        return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
    }

    const incomesQuery = baseQuery('incomes');
    const expensesQuery = baseQuery('expenses');
    const billPaymentsQuery = baseQuery('billPayments');

    const unsubIncomes = onSnapshot(incomesQuery, (incomesSnap) => {
        const unsubExpenses = onSnapshot(expensesQuery, (expensesSnap) => {
            const unsubBillPayments = onSnapshot(billPaymentsQuery, (billPaymentsSnap) => {

                const totalIncomes = incomesSnap.docs
                    .map(doc => doc.data() as Income)
                    .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
                    .filter(filterByPeriod)
                    .reduce((acc, curr) => acc + curr.amount, 0);

                const totalNonSupplierExpenses = expensesSnap.docs
                    .map(doc => doc.data() as Transaction)
                    .filter(expense => expense.mainCategory !== 'Fornecedores')
                    .filter(expense => !expense.paymentMethod.startsWith('Cartão:'))
                    .filter(filterByPeriod)
                    .reduce((acc, curr) => acc + curr.amount, 0);

                const totalBillPayments = billPaymentsSnap.docs
                    .map(doc => doc.data() as BillPayment)
                    .filter(filterByPeriod)
                    .reduce((acc, curr) => acc + curr.amount, 0);
                
                const totalExpenses = totalNonSupplierExpenses + totalBillPayments;

                setNetProfit(totalIncomes - totalExpenses);
                setLoadingNetProfit(false);
            });
            return () => unsubBillPayments();
        });
        return () => unsubExpenses();
    });

    return () => unsubIncomes();

  },[user, activeProfile, selectedYear, selectedMonth, viewModeNetProfit]);


  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);
  
  const formatPercent = (value: number) => {
      return `${value.toFixed(2)}%`.replace('.', ',');
  }


  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 space-y-6">
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{text.sidebar.reports}</h1>
          <p className="text-muted-foreground">{text.reports.description}</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end items-center gap-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">{text.dashboard.monthLabel}</label>
              <Select
                value={String(selectedMonth)}
                onValueChange={(value) => setSelectedMonth(Number(value))}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
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
            <label className="text-sm font-medium">{text.dashboard.yearLabel}</label>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className="w-full sm:w-[120px]">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{text.reports.financialSummary(selectedYear)}</CardTitle>
            </CardHeader>
            <CardContent>
              <AnnualFinancialChart year={selectedYear} onMonthSelect={setSelectedMonth} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          {activeProfile === 'Business' && (
            <>
            <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                     <div className='flex items-center gap-2'>
                      {text.reports.netRevenue}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full cursor-help">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {text.reports.netRevenueTooltip}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                     </div>
                     <Tabs defaultValue="monthly" value={viewModeNetRevenue} onValueChange={(value) => setViewModeNetRevenue(value as ViewMode)} className="w-auto">
                        <TabsList className="h-7">
                          <TabsTrigger value="monthly" className="text-xs px-2 py-1">{text.reports.monthly}</TabsTrigger>
                          <TabsTrigger value="annual" className="text-xs px-2 py-1">{text.reports.annual}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {viewModeNetRevenue === 'monthly'
                        ? `(${months.find((m) => m.value === selectedMonth)?.label} de ${selectedYear})`
                        : `(${selectedYear})`}
                    </p>
                  </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                 {loadingNetRevenue ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                            <TrendingUp className="h-6 w-6 text-indigo-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">
                                {formatCurrency(netRevenue)}
                            </p>
                        </div>
                    </div>
                 )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                     <div className='flex items-center gap-2'>
                      {text.reports.grossProfit}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full cursor-help">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {text.reports.grossProfitTooltip}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                     </div>
                     <Tabs defaultValue="monthly" value={viewModeGrossProfit} onValueChange={(value) => setViewModeGrossProfit(value as ViewMode)} className="w-auto">
                        <TabsList className="h-7">
                          <TabsTrigger value="monthly" className="text-xs px-2 py-1">{text.reports.monthly}</TabsTrigger>
                          <TabsTrigger value="annual" className="text-xs px-2 py-1">{text.reports.annual}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                  </CardTitle>
                   <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {viewModeGrossProfit === 'monthly'
                        ? `(${months.find((m) => m.value === selectedMonth)?.label} de ${selectedYear})`
                        : `(${selectedYear})`}
                    </p>
                  </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-6">
                 {loadingGrossProfit ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 ) : (
                    <div className="w-full space-y-4">
                        <div className="flex items-center justify-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                                <CircleDollarSign className="h-6 w-6 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{text.reports.grossProfit}</p>
                                <p className="text-lg font-semibold">
                                    {formatCurrency(grossProfit)}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                                <Percent className="h-6 w-6 text-orange-500" />
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">{text.reports.grossMargin}</p>
                                <p className="text-lg font-semibold">
                                    {formatPercent(grossMargin)}
                                </p>
                            </div>
                        </div>
                    </div>
                 )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between">
                     <div className='flex items-center gap-2'>
                      {text.reports.netProfit}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full cursor-help">
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {text.reports.netProfitTooltip}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                     </div>
                     <Tabs defaultValue="monthly" value={viewModeNetProfit} onValueChange={(value) => setViewModeNetProfit(value as ViewMode)} className="w-auto">
                        <TabsList className="h-7">
                          <TabsTrigger value="monthly" className="text-xs px-2 py-1">{text.reports.monthly}</TabsTrigger>
                          <TabsTrigger value="annual" className="text-xs px-2 py-1">{text.reports.annual}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {viewModeNetProfit === 'monthly'
                        ? `(${months.find((m) => m.value === selectedMonth)?.label} de ${selectedYear})`
                        : `(${selectedYear})`}
                    </p>
                  </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                 {loadingNetProfit ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                            <DollarSign className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">
                                {formatCurrency(netProfit)}
                            </p>
                        </div>
                    </div>
                 )}
              </CardContent>
            </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
