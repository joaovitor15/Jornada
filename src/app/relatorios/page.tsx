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
import { Transaction, Income } from '@/lib/types';
import { getYear, getMonth } from 'date-fns';
import { CircleDollarSign, HelpCircle, Loader2 } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<ViewMode>('monthly');

  const [grossProfit, setGrossProfit] = useState(0);
  const [loadingGrossProfit, setLoadingGrossProfit] = useState(true);

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
        if (viewMode === 'annual') {
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
                    
                    setGrossProfit(sales - supplierPayments);
                    setLoadingGrossProfit(false);
                }
            );
            return () => unsubExpenses();
        }
    );

    return () => unsubIncomes();

  }, [user, activeProfile, selectedYear, selectedMonth, viewMode]);


  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(amount);

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
                     <Tabs defaultValue="monthly" value={viewMode} onValueChange={(value) => setViewMode(value as ViewMode)} className="w-auto">
                        <TabsList className="h-7">
                          <TabsTrigger value="monthly" className="text-xs px-2 py-1">{text.reports.monthly}</TabsTrigger>
                          <TabsTrigger value="annual" className="text-xs px-2 py-1">{text.reports.annual}</TabsTrigger>
                        </TabsList>
                      </Tabs>
                  </CardTitle>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {viewMode === 'monthly'
                        ? `(${months.find((m) => m.value === selectedMonth)?.label} de ${selectedYear})`
                        : `(${selectedYear})`}
                    </p>
                  </div>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center gap-4 py-10">
                 {loadingGrossProfit ? (
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                 ) : (
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                            <CircleDollarSign className="h-6 w-6 text-green-500" />
                        </div>
                        <div>
                            <p className="text-lg font-semibold">
                                {formatCurrency(grossProfit)}
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
  );
}
