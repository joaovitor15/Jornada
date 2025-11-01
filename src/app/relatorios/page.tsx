
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
import { HelpCircle, Loader2, CircleDollarSign, Percent, DollarSign, TrendingUp, ShoppingCart, Users } from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
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

  // States for data
  const [allIncomes, setAllIncomes] = useState<Income[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // View modes
  const [netRevenueViewMode, setNetRevenueViewMode] = useState('mensal');
  const [grossProfitViewMode, setGrossProfitViewMode] = useState('mensal');
  const [netProfitViewMode, setNetProfitViewMode] = useState('mensal');
  const [cmvViewMode, setCmvViewMode] = useState('mensal');
  const [personnelCostViewMode, setPersonnelCostViewMode] = useState('mensal');

  // States for calculated values
  const [netRevenue, setNetRevenue] = useState(0);
  const [loadingNetRevenue, setLoadingNetRevenue] = useState(true);
  
  const [grossProfit, setGrossProfit] = useState(0);
  const [grossMargin, setGrossMargin] = useState(0);
  const [loadingGrossProfit, setLoadingGrossProfit] = useState(true);

  const [netProfit, setNetProfit] = useState(0);
  const [netMargin, setNetMargin] = useState(0);
  const [loadingNetProfit, setLoadingNetProfit] = useState(true);
  
  const [cmv, setCmv] = useState(0);
  const [costMargin, setCostMargin] = useState(0);
  const [loadingCmv, setLoadingCmv] = useState(true);
  
  const [personnelCost, setPersonnelCost] = useState(0);
  const [personnelCostMargin, setPersonnelCostMargin] = useState(0);
  const [loadingPersonnelCost, setLoadingPersonnelCost] = useState(true);


  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  // Main effect to fetch all data
  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setAllIncomes([]);
      setAllExpenses([]);
      setLoadingData(false);
      return;
    }
    setLoadingData(true);

    const incomesQuery = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid),
      where('profile', '==', 'Business')
    );
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', 'Business')
    );

    const unsubIncomes = onSnapshot(incomesQuery, (snap) => {
      const incomes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Income));
      setAllIncomes(incomes);
      setLoadingData(false);
    }, () => setLoadingData(false));

    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      const expenses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setAllExpenses(expenses);
      setLoadingData(false);
    }, () => setLoadingData(false));
    

    return () => {
      unsubIncomes();
      unsubExpenses();
    };
  }, [user, activeProfile]);

  // Effect for Net Revenue
  useEffect(() => {
    setLoadingNetRevenue(true);
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate = netRevenueViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = netRevenueViewMode === 'mensal' ? endOfMonth : endOfYear;
    
    const filteredIncomes = allIncomes.filter(income => {
      const incomeDate = income.date.toDate();
      return incomeDate >= startDate && incomeDate <= endDate;
    });

    const calculatedNetRevenue = filteredIncomes
      .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
      .reduce((acc, income) => acc + income.amount, 0);

    setNetRevenue(calculatedNetRevenue);
    setLoadingNetRevenue(false);

  }, [allIncomes, selectedYear, selectedMonth, netRevenueViewMode]);


  // Effect for Gross Profit and Gross Margin
  useEffect(() => {
    setLoadingGrossProfit(true);
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate = grossProfitViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = grossProfitViewMode === 'mensal' ? endOfMonth : endOfYear;

    const filteredIncomes = allIncomes.filter(i => {
      const d = i.date.toDate();
      return d >= startDate && d <= endDate;
    });
    
    const filteredExpenses = allExpenses.filter(e => {
       const d = e.date.toDate();
      return d >= startDate && d <= endDate;
    });

    const currentNetRevenue = filteredIncomes
        .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
        .reduce((acc, income) => acc + income.amount, 0);
    
    const supplierCosts = filteredExpenses
        .filter(expense => expense.mainCategory === 'Fornecedores')
        .reduce((acc, expense) => acc + expense.amount, 0);

    const calculatedGrossProfit = currentNetRevenue - supplierCosts;
    const calculatedGrossMargin = currentNetRevenue > 0 ? (calculatedGrossProfit / currentNetRevenue) * 100 : 0;
    
    setGrossProfit(calculatedGrossProfit);
    setGrossMargin(calculatedGrossMargin);
    setLoadingGrossProfit(false);

  }, [allIncomes, allExpenses, selectedYear, selectedMonth, grossProfitViewMode]);


  // Effect for Net Profit and Net Margin
  useEffect(() => {
    setLoadingNetProfit(true);
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
  
    const startDate = netProfitViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = netProfitViewMode === 'mensal' ? endOfMonth : endOfYear;
    
    const filteredIncomes = allIncomes.filter(i => {
      const d = i.date.toDate();
      return d >= startDate && d <= endDate;
    });
    const filteredExpenses = allExpenses.filter(e => {
       const d = e.date.toDate();
      return d >= startDate && d <= endDate;
    });

    const currentNetRevenue = filteredIncomes
      .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
      .reduce((acc, income) => acc + income.amount, 0);

    const totalExpenses = filteredExpenses.reduce((acc, expense) => acc + expense.amount, 0);
  
    const calculatedNetProfit = currentNetRevenue - totalExpenses;
    const calculatedNetMargin = currentNetRevenue > 0 ? (calculatedNetProfit / currentNetRevenue) * 100 : 0;
  
    setNetProfit(calculatedNetProfit);
    setNetMargin(calculatedNetMargin);
    setLoadingNetProfit(false);
  }, [allIncomes, allExpenses, selectedYear, selectedMonth, netProfitViewMode]);

  // Effect for CMV and Cost Margin
  useEffect(() => {
    setLoadingCmv(true);
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate = cmvViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = cmvViewMode === 'mensal' ? endOfMonth : endOfYear;

    const filteredIncomes = allIncomes.filter(i => {
        const d = i.date.toDate();
        return d >= startDate && d <= endDate;
    });
    const filteredExpenses = allExpenses.filter(e => {
        const d = e.date.toDate();
        return d >= startDate && d <= endDate;
    });

    const currentNetRevenue = filteredIncomes
        .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
        .reduce((acc, income) => acc + income.amount, 0);
    
    const calculatedCmv = filteredExpenses
        .filter(expense => expense.mainCategory === 'Fornecedores')
        .reduce((acc, expense) => acc + expense.amount, 0);
    
    const calculatedCostMargin = currentNetRevenue > 0 ? (calculatedCmv / currentNetRevenue) * 100 : 0;

    setCmv(calculatedCmv);
    setCostMargin(calculatedCostMargin);
    setLoadingCmv(false);
  }, [allIncomes, allExpenses, selectedYear, selectedMonth, cmvViewMode]);
  
    // Effect for Personnel Cost
  useEffect(() => {
    setLoadingPersonnelCost(true);
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate = personnelCostViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = personnelCostViewMode === 'mensal' ? endOfMonth : endOfYear;
    
    const filteredIncomes = allIncomes.filter(i => {
        const d = i.date.toDate();
        return d >= startDate && d <= endDate;
    });

    const filteredExpenses = allExpenses.filter(e => {
      const d = e.date.toDate();
      return d >= startDate && d <= endDate;
    });
    
    const currentNetRevenue = filteredIncomes
        .filter(income => income.subcategory !== text.businessCategories.pfpbSubcategory)
        .reduce((acc, income) => acc + income.amount, 0);

    const calculatedPersonnelCost = filteredExpenses
      .filter(expense => expense.mainCategory === 'Funcionários')
      .reduce((acc, expense) => acc + expense.amount, 0);

    const calculatedPersonnelCostMargin = currentNetRevenue > 0 ? (calculatedPersonnelCost / currentNetRevenue) * 100 : 0;

    setPersonnelCost(calculatedPersonnelCost);
    setPersonnelCostMargin(calculatedPersonnelCostMargin);
    setLoadingPersonnelCost(false);
  }, [allIncomes, allExpenses, selectedYear, selectedMonth, personnelCostViewMode]);


  const periodLabel = useMemo(() => {
    return `${months[selectedMonth].label} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  if (activeProfile !== 'Business') {
    return (
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
    );
  }

  const isLoading = loadingData || loadingNetRevenue || loadingGrossProfit || loadingNetProfit || loadingCmv || loadingPersonnelCost;

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {text.reports.cmv}
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div style={{ whiteSpace: 'pre-line' }}>
                            {text.reports.cmvTooltip}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div>
                    <Tabs
                      value={cmvViewMode}
                      onValueChange={setCmvViewMode}
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
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      ({cmvViewMode === 'mensal' ? periodLabel : selectedYear})
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                        <ShoppingCart className="h-6 w-6 text-red-500" />
                      </div>
                      <span className="text-2xl font-bold">
                        {formatCurrency(cmv)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{text.reports.costMargin}</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {text.reports.costMarginTooltip}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/50">
                          <Percent className="h-6 w-6 text-pink-500" />
                        </div>
                        <span className="text-2xl font-bold">
                          {formatPercent(costMargin)}
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
                      {text.reports.personnelCost}
                    </CardTitle>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <HelpCircle className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <div style={{ whiteSpace: 'pre-line' }}>
                            {text.reports.personnelCostTooltip}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div>
                    <Tabs
                      value={personnelCostViewMode}
                      onValueChange={setPersonnelCostViewMode}
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
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      ({personnelCostViewMode === 'mensal' ? periodLabel : selectedYear})
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="flex justify-center items-center h-24">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-100 dark:bg-cyan-900/50">
                        <Users className="h-6 w-6 text-cyan-500" />
                      </div>
                      <span className="text-2xl font-bold">
                        {formatCurrency(personnelCost)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{text.reports.personnelCostMargin}</h3>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {text.reports.personnelCostMarginTooltip}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 dark:bg-teal-900/50">
                          <Percent className="h-6 w-6 text-teal-500" />
                        </div>
                        <span className="text-2xl font-bold">
                          {formatPercent(personnelCostMargin)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
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
                <div>
                  <Tabs
                    value={netRevenueViewMode}
                    onValueChange={setNetRevenueViewMode}
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
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    (
                    {netRevenueViewMode === 'mensal'
                      ? periodLabel
                      : selectedYear}
                    )
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
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
                 <div>
                  <Tabs
                    value={grossProfitViewMode}
                    onValueChange={setGrossProfitViewMode}
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
                   <p className="text-xs text-muted-foreground text-center mt-1">
                    ({grossProfitViewMode === 'mensal' ? periodLabel : selectedYear})
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
               {isLoading ? (
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
                 <div>
                  <Tabs
                    value={netProfitViewMode}
                    onValueChange={setNetProfitViewMode}
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
                   <p className="text-xs text-muted-foreground text-center mt-1">
                    ({netProfitViewMode === 'mensal' ? periodLabel : selectedYear})
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
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
    </div>
  );
}
