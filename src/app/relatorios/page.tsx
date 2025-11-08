
'use client';

import { useState, useMemo } from 'react';
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
import { HelpCircle, Loader2, CircleDollarSign, Percent, DollarSign, TrendingUp, ShoppingCart, Users, Landmark, HardDrive, ClipboardList, ArrowUpCircle, TrendingDown, Wallet } from 'lucide-react';
import { useTransactions } from '@/hooks/use-transactions';
import CategoryCardSpendingTabs from '@/components/relatorios/CategoryCardSpendingTabs';
import IncomeAnalysisTabs from '@/components/relatorios/IncomeAnalysisTabs';
import HomeAndPersonalCards from '@/components/relatorios/HomeAndPersonalCards';
import { useTags } from '@/hooks/use-tags';


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
  const { activeProfile } = useProfile();
  const { incomes: allIncomes, expenses: allExpenses, billPayments: allBillPayments, loading: dataLoading } = useTransactions(activeProfile);
  const { hierarchicalTags, loading: tagsLoading } = useTags();

  const yearOptions = generateYearOptions();
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );

  // View modes
  const [netRevenueViewMode, setNetRevenueViewMode] = useState('mensal');
  const [grossProfitViewMode, setGrossProfitViewMode] = useState('mensal');
  const [netProfitViewMode, setNetProfitViewMode] = useState('mensal');
  const [cmvViewMode, setCmvViewMode] = useState('mensal');
  const [personnelCostViewMode, setPersonnelCostViewMode] = useState('mensal');
  const [impostosViewMode, setImpostosViewMode] = useState('mensal');
  const [sistemaViewMode, setSistemaViewMode] = useState('mensal');
  const [fixedCostsViewMode, setFixedCostsViewMode] = useState('mensal');

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  

  // --- Business Profile Calculations ---
  const netRevenue = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return 0;
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = netRevenueViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = netRevenueViewMode === 'mensal' ? endOfMonth : endOfYear;

    const receitasTag = hierarchicalTags.find(tag => tag.name === 'Receitas');
    const receitaTagNames = new Set<string>();
    if (receitasTag) {
        receitasTag.children.forEach(child => receitaTagNames.add(child.name));
    }

    return allIncomes
      .filter(income => {
        if (!income.date) return false;
        const incomeDate = income.date.toDate();
        const isInDateRange = incomeDate >= startDate && incomeDate <= endDate;
        if (!isInDateRange) return false;
        
        return income.tags?.some(tag => receitaTagNames.has(tag)) ?? false;
      })
      .reduce((acc, income) => acc + income.amount, 0);
  }, [allIncomes, selectedYear, selectedMonth, netRevenueViewMode, activeProfile, hierarchicalTags, tagsLoading]);

 const { grossProfit, grossMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { grossProfit: 0, grossMargin: 0 };
    
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = grossProfitViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = grossProfitViewMode === 'mensal' ? endOfMonth : endOfYear;

    const fornecedoresTag = hierarchicalTags.find(t => t.name === 'Fornecedores');
    const fornecedorTagNames = new Set<string>();
    if (fornecedoresTag) {
      fornecedoresTag.children.forEach(child => fornecedorTagNames.add(child.name));
    }

    const supplierCosts = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        if (!(d >= startDate && d <= endDate)) return false;
        
        return e.tags?.some(tag => fornecedorTagNames.has(tag)) ?? false;
      })
      .reduce((acc, expense) => acc + expense.amount, 0);

    const calculatedGrossProfit = netRevenue - supplierCosts;
    const calculatedGrossMargin = netRevenue > 0 ? (calculatedGrossProfit / netRevenue) * 100 : 0;
    return { grossProfit: calculatedGrossProfit, grossMargin: calculatedGrossMargin };
}, [allExpenses, selectedYear, selectedMonth, grossProfitViewMode, activeProfile, hierarchicalTags, tagsLoading, netRevenue]);

  const { netProfit, netMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { netProfit: 0, netMargin: 0 };

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = netProfitViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = netProfitViewMode === 'mensal' ? endOfMonth : endOfYear;
    
    const receitasTag = hierarchicalTags.find(tag => tag.name === 'Receitas');
    const receitaTagNames = new Set<string>();
    if (receitasTag) {
        receitasTag.children.forEach(child => receitaTagNames.add(child.name));
    }

    const totalRevenueFromTags = allIncomes
      .filter(income => {
        if (!income.date) return false;
        const incomeDate = income.date.toDate();
        const isInDateRange = incomeDate >= startDate && incomeDate <= endDate;
        if (!isInDateRange) return false;
        return income.tags?.some(tag => receitaTagNames.has(tag)) ?? false;
      })
      .reduce((acc, income) => acc + income.amount, 0);

    const totalExpenses = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        return d >= startDate && d <= endDate;
      })
      .reduce((acc, expense) => acc + expense.amount, 0);
      
    const calculatedNetProfit = totalRevenueFromTags - totalExpenses;
    const calculatedNetMargin = totalRevenueFromTags > 0 ? (calculatedNetProfit / totalRevenueFromTags) * 100 : 0;
    return { netProfit: calculatedNetProfit, netMargin: calculatedNetMargin };
  }, [allIncomes, allExpenses, selectedYear, selectedMonth, netProfitViewMode, activeProfile, hierarchicalTags, tagsLoading]);

  const { cmv, costMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { cmv: 0, costMargin: 0 };

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = cmvViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = cmvViewMode === 'mensal' ? endOfMonth : endOfYear;

    const fornecedoresTag = hierarchicalTags.find(t => t.name === 'Fornecedores');
    const fornecedorTagNames = new Set<string>();
    if (fornecedoresTag) {
        fornecedoresTag.children.forEach(child => fornecedorTagNames.add(child.name));
    }

    const calculatedCmv = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        if (!(d >= startDate && d <= endDate)) return false;
        
        return e.tags?.some(tag => fornecedorTagNames.has(tag)) ?? false;
      })
      .reduce((acc, expense) => acc + expense.amount, 0);
      
    const calculatedCostMargin = netRevenue > 0 ? (calculatedCmv / netRevenue) * 100 : 0;
    return { cmv: calculatedCmv, costMargin: calculatedCostMargin };
}, [allExpenses, selectedYear, selectedMonth, cmvViewMode, activeProfile, hierarchicalTags, tagsLoading, netRevenue]);
  
  const { personnelCost, personnelCostMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { personnelCost: 0, personnelCostMargin: 0 };

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = personnelCostViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = personnelCostViewMode === 'mensal' ? endOfMonth : endOfYear;

    const tagPrincipal = hierarchicalTags.find(t => t.name === 'Funcionários');
    const tagNames = new Set<string>();
    if (tagPrincipal) {
      tagPrincipal.children.forEach(child => tagNames.add(child.name));
    }

    const calculatedCost = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        if (!(d >= startDate && d <= endDate)) return false;
        return e.tags?.some(tag => tagNames.has(tag)) ?? false;
      })
      .reduce((acc, expense) => acc + expense.amount, 0);

    const calculatedMargin = netRevenue > 0 ? (calculatedCost / netRevenue) * 100 : 0;
    return { personnelCost: calculatedCost, personnelCostMargin: calculatedMargin };
  }, [allExpenses, selectedYear, selectedMonth, personnelCostViewMode, activeProfile, hierarchicalTags, tagsLoading, netRevenue]);

  const { impostos, impostosMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { impostos: 0, impostosMargin: 0 };

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = impostosViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = impostosViewMode === 'mensal' ? endOfMonth : endOfYear;

    const tagPrincipal = hierarchicalTags.find(t => t.name === 'Impostos');
    const tagNames = new Set<string>();
    if (tagPrincipal) {
      tagPrincipal.children.forEach(child => tagNames.add(child.name));
    }
      
    const calculatedImpostos = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        if (!(d >= startDate && d <= endDate)) return false;
        return e.tags?.some(tag => tagNames.has(tag)) ?? false;
      })
      .reduce((acc, expense) => acc + expense.amount, 0);
      
    const calculatedImpostosMargin = netRevenue > 0 ? (calculatedImpostos / netRevenue) * 100 : 0;
    return { impostos: calculatedImpostos, impostosMargin: calculatedImpostosMargin };
  }, [allExpenses, selectedYear, selectedMonth, impostosViewMode, activeProfile, hierarchicalTags, tagsLoading, netRevenue]);

  const { sistema, sistemaMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { sistema: 0, sistemaMargin: 0 };

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = sistemaViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = sistemaViewMode === 'mensal' ? endOfMonth : endOfYear;

    const tagPrincipal = hierarchicalTags.find(t => t.name === 'Sistema');
    const tagNames = new Set<string>();
    if (tagPrincipal) {
      tagPrincipal.children.forEach(child => tagNames.add(child.name));
    }

    const calculatedSistema = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        if (!(d >= startDate && d <= endDate)) return false;
        return e.tags?.some(tag => tagNames.has(tag)) ?? false;
      })
      .reduce((acc, expense) => acc + expense.amount, 0);
      
    const calculatedSistemaMargin = netRevenue > 0 ? (calculatedSistema / netRevenue) * 100 : 0;
    return { sistema: calculatedSistema, sistemaMargin: calculatedSistemaMargin };
  }, [allExpenses, selectedYear, selectedMonth, sistemaViewMode, activeProfile, hierarchicalTags, tagsLoading, netRevenue]);

  const { fixedCosts, fixedCostsMargin } = useMemo(() => {
    if (activeProfile !== 'Business' || tagsLoading) return { fixedCosts: 0, fixedCostsMargin: 0 };

    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const endOfMonth = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
    const startOfYear = new Date(selectedYear, 0, 1);
    const endOfYear = new Date(selectedYear, 11, 31, 23, 59, 59);
    const startDate = fixedCostsViewMode === 'mensal' ? startOfMonth : startOfYear;
    const endDate = fixedCostsViewMode === 'mensal' ? endOfMonth : endOfYear;

    const fornecedoresTag = hierarchicalTags.find(t => t.name === 'Fornecedores');
    const fornecedorTagNames = new Set<string>();
    if (fornecedoresTag) {
        fornecedoresTag.children.forEach(child => fornecedorTagNames.add(child.name));
    }
      
    const allPeriodExpenses = allExpenses
      .filter(e => {
        if (!e.date) return false;
        const d = e.date.toDate();
        return d >= startDate && d <= endDate;
      });

    const supplierCosts = allPeriodExpenses
        .filter(e => e.tags?.some(tag => fornecedorTagNames.has(tag)) ?? false)
        .reduce((acc, expense) => acc + expense.amount, 0);

    const totalExpenses = allPeriodExpenses.reduce((acc, expense) => acc + expense.amount, 0);
    
    const calculatedFixedCosts = totalExpenses - supplierCosts;
      
    const calculatedFixedCostsMargin = netRevenue > 0 ? (calculatedFixedCosts / netRevenue) * 100 : 0;
    return { fixedCosts: calculatedFixedCosts, fixedCostsMargin: calculatedFixedCostsMargin };
  }, [allExpenses, selectedYear, selectedMonth, fixedCostsViewMode, activeProfile, hierarchicalTags, tagsLoading, netRevenue]);


  const periodLabel = useMemo(() => {
    return `${months[selectedMonth].label} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);
  
  const commonHeader = (
    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
      <div>
        <h1 className="text-2xl font-bold">{text.sidebar.reports}</h1>
        <p className="text-muted-foreground">{text.reports.description}</p>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium">{text.dashboard.monthLabel}:</label>
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
          <label className="text-sm font-medium">{text.dashboard.yearLabel}:</label>
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
  );

  const isLoading = dataLoading || tagsLoading;

  if (activeProfile === 'Personal' || activeProfile === 'Home') {
    return (
       <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
         {commonHeader}
         <div className="space-y-6"> 
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 space-y-6">
               <Card>
                 <CardHeader>
                   <CardTitle>
                     {text.reports.financialSummary(selectedYear)}
                   </CardTitle>
                 </CardHeader>
                 <CardContent>
                   <AnnualFinancialChart year={selectedYear} onMonthSelect={setSelectedMonth} />
                 </CardContent>
               </Card>
             </div>
             <div className="lg:col-span-1 space-y-6">
                 <HomeAndPersonalCards 
                     selectedMonth={selectedMonth}
                     selectedYear={selectedYear}
                 />
             </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CategoryCardSpendingTabs 
                 selectedMonth={selectedMonth} 
                 selectedYear={selectedYear}
                 showCardSpending={activeProfile === 'Personal'}
             />
             <IncomeAnalysisTabs 
                 selectedMonth={selectedMonth} 
                 selectedYear={selectedYear}
             />
           </div>
         </div>
       </div>
   );
 }


  if (activeProfile === 'Business') {
    return (
      <div className="p-4 md:p-6 lg:p-8 lg:pt-4">
        {commonHeader}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>
                  {text.reports.financialSummary(selectedYear)}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnnualFinancialChart year={selectedYear} onMonthSelect={setSelectedMonth} />
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {text.reports.fixedCosts}
                      </CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {text.reports.fixedCostsTooltip}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <Tabs
                        value={fixedCostsViewMode}
                        onValueChange={setFixedCostsViewMode}
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
                        ({fixedCostsViewMode === 'mensal' ? periodLabel : selectedYear})
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900/50">
                          <ClipboardList className="h-6 w-6 text-gray-500" />
                        </div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(fixedCosts)}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{text.reports.fixedCostsMargin}</h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div style={{ whiteSpace: 'pre-line' }}>
                                  {text.reports.fixedCostsMarginTooltip}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900/50">
                             <Percent className="h-6 w-6 text-gray-500" />
                          </div>
                          <span className="text-2xl font-bold">
                            {formatPercent(fixedCostsMargin)}
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
                        {text.reports.impostos}
                      </CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {text.reports.impostosTooltip}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <Tabs
                        value={impostosViewMode}
                        onValueChange={setImpostosViewMode}
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
                        ({impostosViewMode === 'mensal' ? periodLabel : selectedYear})
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/50">
                          <Landmark className="h-6 w-6 text-orange-500" />
                        </div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(impostos)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{text.reports.impostosMargin}</h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div style={{ whiteSpace: 'pre-line' }}>
                                  {text.reports.impostosMarginTooltip}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/50">
                            <Percent className="h-6 w-6 text-yellow-500" />
                          </div>
                          <span className="text-2xl font-bold">
                            {formatPercent(impostosMargin)}
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
                    <div className="flex justify-center items-center">
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
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg">
                        {text.reports.sistema}
                      </CardTitle>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <HelpCircle className="h-4 w-4 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <div style={{ whiteSpace: 'pre-line' }}>
                              {text.reports.sistemaTooltip}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div>
                      <Tabs
                        value={sistemaViewMode}
                        onValueChange={setSistemaViewMode}
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
                        ({sistemaViewMode === 'mensal' ? periodLabel : selectedYear})
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/50">
                          <HardDrive className="h-6 w-6 text-indigo-500" />
                        </div>
                        <span className="text-2xl font-bold">
                          {formatCurrency(sistema)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{text.reports.sistemaMargin}</h3>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <div style={{ whiteSpace: 'pre-line' }}>
                                  {text.reports.sistemaMarginTooltip}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/50">
                            <Percent className="h-6 w-6 text-purple-500" />
                          </div>
                          <span className="text-2xl font-bold">
                            {formatPercent(sistemaMargin)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
              <div className="md:col-span-2">
                 <CategoryCardSpendingTabs 
                   selectedMonth={selectedMonth} 
                   selectedYear={selectedYear} 
                   showCardSpending={false} 
                  />
              </div>
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
              <CardHeader className="pb-2">
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
              <CardContent>
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
                        
                        <div className="mt-4 space-y-2">
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
                  <div className="flex justify-center items-center">
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
                  <div className="flex justify-center items-center">
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
          </div>
        </div>
      </div>
    );
  }

  // Fallback return if profile is not one of the handled cases
  return null;
}
