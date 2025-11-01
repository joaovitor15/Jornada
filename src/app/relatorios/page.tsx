
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import AnnualFinancialChart from '@/components/relatorios/AnnualFinancialChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { text } from '@/lib/strings';
import { useProfile } from '@/hooks/use-profile';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { HelpCircle, Loader2, CircleDollarSign, Percent, TrendingUp, DollarSign } from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { getMonth, getYear } from 'date-fns';
import type { Income, Expense } from '@/lib/types';


const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const months = Object.entries(text.dashboard.months).map(
  ([key, label], index) => ({
    value: index,
    label: label,
  })
);

export default function ReportsPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const yearOptions = generateYearOptions();
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  const [viewMode, setViewMode] = useState('mensal');

  const [loading, setLoading] = useState(true);
  const [netRevenue, setNetRevenue] = useState(0);
  const [grossProfit, setGrossProfit] = useState(0);
  const [grossMargin, setGrossMargin] = useState(0);
  const [netProfit, setNetProfit] = useState(0);
  const [netMargin, setNetMargin] = useState(0);


  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setNetRevenue(0);
      setGrossProfit(0);
      setGrossMargin(0);
      setNetProfit(0);
      setNetMargin(0);
      setLoading(false);
      return;
    }
    setLoading(true);

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate = viewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = viewMode === 'mensal' ? endOfMonth : endOfYear;

    const incomesQuery = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid),
      where('profile', '==', 'Business'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', 'Business'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const unsubIncomes = onSnapshot(incomesQuery, (incomesSnap) => {
      const unsubExpenses = onSnapshot(expensesSnap, (expensesSnap) => {
        let calculatedNetRevenue = 0;
        incomesSnap.forEach((doc) => {
          const income = doc.data() as Income;
          if (income.subcategory !== text.businessCategories.pfpbSubcategory) {
            calculatedNetRevenue += income.amount;
          }
        });

        let supplierCosts = 0;
        let totalExpenses = 0;
        expensesSnap.forEach((doc) => {
          const expense = doc.data() as Expense;
          totalExpenses += expense.amount;
          if (expense.mainCategory === 'Fornecedores') {
            supplierCosts += expense.amount;
          }
        });
        
        const calculatedGrossProfit = calculatedNetRevenue - supplierCosts;
        const calculatedGrossMargin = calculatedNetRevenue > 0 ? (calculatedGrossProfit / calculatedNetRevenue) * 100 : 0;
        const calculatedNetProfit = calculatedNetRevenue - totalExpenses;
        const calculatedNetMargin = calculatedNetRevenue > 0 ? (calculatedNetProfit / calculatedNetRevenue) * 100 : 0;

        setNetRevenue(calculatedNetRevenue);
        setGrossProfit(calculatedGrossProfit);
        setGrossMargin(calculatedGrossMargin);
        setNetProfit(calculatedNetProfit);
        setNetMargin(calculatedNetMargin);
        setLoading(false);
      }, () => setLoading(false));

      return () => unsubExpenses();
    }, () => setLoading(false));

    return () => unsubIncomes();
  }, [user, activeProfile, selectedYear, selectedMonth, viewMode]);


  const periodLabel = useMemo(() => {
    return `${months[selectedMonth].label} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{text.sidebar.reports}</h1>
          <p className="text-muted-foreground">{text.reports.description}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">
              {text.dashboard.monthLabel}:
            </label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger className="w-36">
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
              {text.dashboard.yearLabel}:
            </label>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder={text.dashboard.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {activeProfile === 'Business' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {text.reports.financialSummary(selectedYear)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnnualFinancialChart year={selectedYear} />
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {text.reports.netRevenue}
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                           <div style={{ whiteSpace: 'pre-line' }}>
                            {text.reports.netRevenueTooltip}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Tabs
                    value={viewMode}
                    onValueChange={setViewMode}
                    className="w-auto"
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="mensal" className="text-xs px-2 py-1">
                        {text.reports.monthly}
                      </TabsTrigger>
                      <TabsTrigger value="anual" className="text-xs px-2 py-1">
                        {text.reports.annual}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <p className="text-xs text-muted-foreground">
                  (
                  {viewMode === 'mensal'
                    ? periodLabel
                    : selectedYear}
                  )
                </p>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                      <TrendingUp className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="text-2xl font-bold">
                      {formatCurrency(netRevenue)}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                   <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">{text.reports.grossProfit}</CardTitle>
                     <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <div style={{ whiteSpace: 'pre-line' }}>
                                    {text.reports.grossProfitTooltip}
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                  </div>
                   <Tabs
                    value={viewMode}
                    onValueChange={setViewMode}
                    className="w-auto"
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="mensal" className="text-xs px-2 py-1">
                        {text.reports.monthly}
                      </TabsTrigger>
                      <TabsTrigger value="anual" className="text-xs px-2 py-1">
                        {text.reports.annual}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                 <p className="text-xs text-muted-foreground">
                  ({viewMode === 'mensal' ? periodLabel : selectedYear})
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                 {loading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                 ) : (
                    <>
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                                <CircleDollarSign className="h-6 w-6 text-green-500" />
                            </div>
                            <span className="text-2xl font-bold">
                                {formatCurrency(grossProfit)}
                            </span>
                        </div>
                        
                        <div className="space-y-2">
                             <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{text.reports.grossMargin}</h3>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger>
                                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <div style={{ whiteSpace: 'pre-line' }}>
                                                    {text.reports.grossMarginTooltip}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                            </div>
                            <div className="flex items-center gap-4">
                               <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                                    <Percent className="h-6 w-6 text-orange-500" />
                                </div>
                                <span className="text-2xl font-bold">
                                    {formatPercent(grossMargin)}
                                </span>
                            </div>
                        </div>
                    </>
                 )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {text.reports.netProfit}
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div style={{ whiteSpace: 'pre-line' }}>
                            {text.reports.netProfitTooltip}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                   <Tabs
                    value={viewMode}
                    onValueChange={setViewMode}
                    className="w-auto"
                  >
                    <TabsList className="h-8">
                      <TabsTrigger value="mensal" className="text-xs px-2 py-1">
                        {text.reports.monthly}
                      </TabsTrigger>
                      <TabsTrigger value="anual" className="text-xs px-2 py-1">
                        {text.reports.annual}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <p className="text-xs text-muted-foreground">
                  ({viewMode === 'mensal' ? periodLabel : selectedYear})
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                        <DollarSign className="h-6 w-6 text-purple-500" />
                      </div>
                      <span className="text-2xl font-bold">
                        {formatCurrency(netProfit)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{text.reports.netMargin}</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {text.reports.netMarginTooltip}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                          <Percent className="h-6 w-6 text-indigo-500" />
                        </div>
                        <span className="text-2xl font-bold">
                          {formatPercent(netMargin)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {text.reports.financialSummary(selectedYear)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AnnualFinancialChart year={selectedYear} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
