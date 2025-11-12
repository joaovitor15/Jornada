
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
import { useBusinessMetrics } from '@/hooks/use-business-metrics';


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
  
  const [selectedYear, setSelectedYear] = useState<number>(
    new Date().getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState<number>(
    new Date().getMonth()
  );
  
  const [netRevenueViewMode, setNetRevenueViewMode] = useState('mensal');
  const [grossProfitViewMode, setGrossProfitViewMode] = useState('mensal');
  const [netProfitViewMode, setNetProfitViewMode] = useState('mensal');
  const [cmvViewMode, setCmvViewMode] = useState('mensal');
  const [personnelCostViewMode, setPersonnelCostViewMode] = useState('mensal');
  const [impostosViewMode, setImpostosViewMode] = useState('mensal');
  const [sistemaViewMode, setSistemaViewMode] = useState('mensal');
  const [fixedCostsViewMode, setFixedCostsViewMode] = useState('mensal');
  
  const yearOptions = generateYearOptions();
  
  // Determine period based on view mode for each card
  const getPeriod = (viewMode: string) => viewMode === 'mensal' 
    ? { year: selectedYear, month: selectedMonth } 
    : { year: selectedYear };

  // Fetch data for all view modes at once
  const { incomes: monthlyIncomes, expenses: monthlyExpenses, loading: monthlyLoading } = useTransactions(activeProfile, getPeriod('mensal'));
  const { incomes: annualIncomes, expenses: annualExpenses, loading: annualLoading } = useTransactions(activeProfile, getPeriod('anual'));
  
  const { hierarchicalTags, loading: tagsLoading } = useTags();
  
  const monthlyMetrics = useBusinessMetrics(monthlyIncomes, monthlyExpenses, hierarchicalTags);
  const annualMetrics = useBusinessMetrics(annualIncomes, annualExpenses, hierarchicalTags);


  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };
  
  const formatPercent = (value: number) => {
    return `${value.toFixed(2)}%`;
  };
  
  const getMetric = (viewMode: string, metricName: keyof typeof monthlyMetrics) => {
      const metrics = viewMode === 'mensal' ? monthlyMetrics : annualMetrics;
      return metrics[metricName] || 0;
  };
  
  const isLoading = (viewMode: string) => viewMode === 'mensal' ? monthlyLoading : annualLoading;


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

  if (tagsLoading) {
     return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

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
                 <HomeAndPersonalCards />
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
                    {isLoading(fixedCostsViewMode) ? (
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
                            {formatCurrency(getMetric(fixedCostsViewMode, 'fixedCosts'))}
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
                              {formatPercent(getMetric(fixedCostsViewMode, 'fixedCostsMargin'))}
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
                    {isLoading(impostosViewMode) ? (
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
                            {formatCurrency(getMetric(impostosViewMode, 'impostos'))}
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
                              {formatPercent(getMetric(impostosViewMode, 'impostosMargin'))}
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
                    {isLoading(personnelCostViewMode) ? (
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
                            {formatCurrency(getMetric(personnelCostViewMode, 'personnelCost'))}
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
                              {formatPercent(getMetric(personnelCostViewMode, 'personnelCostMargin'))}
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
                    {isLoading(sistemaViewMode) ? (
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
                            {formatCurrency(getMetric(sistemaViewMode, 'sistema'))}
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
                              {formatPercent(getMetric(sistemaViewMode, 'sistemaMargin'))}
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
                  {isLoading(netRevenueViewMode) ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                        <TrendingUp className="h-6 w-6 text-blue-500" />
                      </div>
                      <span className="text-2xl font-bold">
                        {formatCurrency(getMetric(netRevenueViewMode, 'netRevenue'))}
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
                  {isLoading(grossProfitViewMode) ? (
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
                          {formatCurrency(getMetric(grossProfitViewMode, 'grossProfit'))}
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
                            {formatPercent(getMetric(grossProfitViewMode, 'grossMargin'))}
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
                  {isLoading(netProfitViewMode) ? (
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
                          {formatCurrency(getMetric(netProfitViewMode, 'netProfit'))}
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
                            {formatPercent(getMetric(netProfitViewMode, 'netMargin'))}
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
                  {isLoading(cmvViewMode) ? (
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
                          {formatCurrency(getMetric(cmvViewMode, 'cmv'))}
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
                            {formatPercent(getMetric(cmvViewMode, 'costMargin'))}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
            <CategoryCardSpendingTabs 
              selectedMonth={selectedMonth} 
              selectedYear={selectedYear} 
              showCardSpending={false} 
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

  // Fallback return if profile is not one of the handled cases
  return null;
}
