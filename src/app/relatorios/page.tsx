
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
import { HelpCircle, Loader2, CircleDollarSign, Percent, TrendingUp } from 'lucide-react';
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
  const [viewModeGrossProfit, setViewModeGrossProfit] = useState('mensal');
  const [viewModeNetProfit, setViewModeNetProfit] = useState('mensal');
  const [viewModeNetRevenue, setViewModeNetRevenue] = useState('mensal');

  const [loadingGrossProfit, setLoadingGrossProfit] = useState(true);
  const [grossProfit, setGrossProfit] = useState(0);
  const [loadingNetProfit, setLoadingNetProfit] = useState(true);
  const [netProfit, setNetProfit] = useState(0);
  const [loadingNetRevenue, setLoadingNetRevenue] = useState(true);
  const [netRevenue, setNetRevenue] = useState(0);
  const [grossMargin, setGrossMargin] = useState(0);

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  // Effect for Net Revenue
  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setNetRevenue(0);
      setLoadingNetRevenue(false);
      return;
    }
    setLoadingNetRevenue(true);

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate =
      viewModeNetRevenue === 'mensal' ? startOfMonth : startOfYear;
    const endDate = viewModeNetRevenue === 'mensal' ? endOfMonth : endOfYear;

    const q = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid),
      where('profile', '==', 'Business'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let totalRevenue = 0;
      snapshot.forEach((doc) => {
        const income = doc.data();
        if (income.subcategory !== text.businessCategories.pfpbSubcategory) {
          totalRevenue += income.amount;
        }
      });
      setNetRevenue(totalRevenue);
      setLoadingNetRevenue(false);
    }, () => {
      setLoadingNetRevenue(false);
    });

    return () => unsubscribe();
  }, [user, activeProfile, selectedYear, selectedMonth, viewModeNetRevenue]);

  // Effect for Gross Profit and Gross Margin
  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setGrossProfit(0);
      setGrossMargin(0);
      setLoadingGrossProfit(false);
      return;
    }
    setLoadingGrossProfit(true);

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate = viewModeGrossProfit === 'mensal' ? startOfMonth : startOfYear;
    const endDate = viewModeGrossProfit === 'mensal' ? endOfMonth : endOfYear;
    
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
      where('mainCategory', '==', 'Fornecedores'),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const unsubIncomes = onSnapshot(incomesQuery, (incomesSnap) => {
        let currentNetRevenue = 0;
        incomesSnap.forEach((doc) => {
            const income = doc.data();
            if (income.subcategory !== text.businessCategories.pfpbSubcategory) {
                currentNetRevenue += income.amount;
            }
        });
    
        const unsubExpenses = onSnapshot(expensesQuery, (expensesSnap) => {
            let supplierCosts = 0;
            expensesSnap.forEach((doc) => {
                supplierCosts += doc.data().amount;
            });

            const calculatedGrossProfit = currentNetRevenue - supplierCosts;
            setGrossProfit(calculatedGrossProfit);

            const calculatedGrossMargin = currentNetRevenue > 0 ? (calculatedGrossProfit / currentNetRevenue) * 100 : 0;
            setGrossMargin(calculatedGrossMargin);

            setLoadingGrossProfit(false);
        }, () => {
            setLoadingGrossProfit(false);
        });

        return () => unsubExpenses();

    }, () => {
      setLoadingGrossProfit(false);
    });
    
    return () => unsubIncomes();

  }, [
    user,
    activeProfile,
    selectedYear,
    selectedMonth,
    viewModeGrossProfit
  ]);

  // Effect for Net Profit
  useEffect(() => {
    if (!user || activeProfile !== 'Business') {
      setNetProfit(0);
      setLoadingNetProfit(false);
      return;
    }
    setLoadingNetProfit(true);

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);

    const startDate =
      viewModeNetProfit === 'mensal' ? startOfMonth : startOfYear;
    const endDate = viewModeNetProfit === 'mensal' ? endOfMonth : endOfYear;

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
      let totalRevenue = 0;
      incomesSnap.forEach((doc) => {
        const income = doc.data();
        if (income.subcategory !== text.businessCategories.pfpbSubcategory) {
          totalRevenue += income.amount;
        }
      });

      const unsubExpenses = onSnapshot(expensesQuery, (expensesSnap) => {
        let totalExpenses = 0;
        expensesSnap.forEach((doc) => {
          const expense = doc.data();
          if (expense.mainCategory !== 'Fornecedores') {
            totalExpenses += expense.amount;
          }
        });

        // O lucro bruto (receita - custos de fornecedores) já foi calculado em outro effect.
        // Lucro líquido é Lucro Bruto - Outras Despesas.
        // Mas para simplificar aqui: (Receita - CustoFornecedores) - OutrasDespesas = Receita - (CustoFornecedores+OutrasDespesas)
        // Onde (CustoFornecedores+OutrasDespesas) é o total de despesas.
        // Vamos recalcular o total de despesas aqui para ter certeza.
        let totalAllExpenses = 0;
        expensesSnap.forEach((doc) => {
            totalAllExpenses += doc.data().amount;
        });
        
        const calculatedNetProfit = totalRevenue - totalAllExpenses;
        setNetProfit(calculatedNetProfit);
        setLoadingNetProfit(false);
      }, () => {
          setLoadingNetProfit(false);
      });

      return () => unsubExpenses();
    }, () => {
        setLoadingNetProfit(false);
    });

    return () => unsubIncomes();
  }, [user, activeProfile, selectedYear, selectedMonth, viewModeNetProfit]);

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
                    value={viewModeNetRevenue}
                    onValueChange={setViewModeNetRevenue}
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
                  {viewModeNetRevenue === 'mensal'
                    ? periodLabel
                    : selectedYear}
                  )
                </p>
              </CardHeader>
              <CardContent>
                {loadingNetRevenue ? (
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
                    value={viewModeGrossProfit}
                    onValueChange={setViewModeGrossProfit}
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
                  ({viewModeGrossProfit === 'mensal' ? periodLabel : selectedYear})
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                 {loadingGrossProfit ? (
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
                             <div className="flex justify-between items-center">
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
                    value={viewModeNetProfit}
                    onValueChange={setViewModeNetProfit}
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
                  ({viewModeNetProfit === 'mensal' ? periodLabel : selectedYear})
                </p>
              </CardHeader>
              <CardContent>
                {loadingNetProfit ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                      <CircleDollarSign className="h-6 w-6 text-purple-500" />
                    </div>
                    <span className="text-2xl font-bold">
                      {formatCurrency(netProfit)}
                    </span>
                  </div>
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

    