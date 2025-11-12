
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
import { text } from '@/lib/strings';
import { useProfile } from '@/hooks/use-profile';
import {
  Loader2,
  TrendingUp,
  ShoppingCart,
  Users,
  Landmark,
  HardDrive,
  ClipboardList,
  CircleDollarSign,
  DollarSign,
} from 'lucide-react';
import { useTransactions } from '@/hooks/use-transactions';
import CategoryCardSpendingTabs from '@/components/relatorios/CategoryCardSpendingTabs';
import IncomeAnalysisTabs from '@/components/relatorios/IncomeAnalysisTabs';
import HomeAndPersonalCards from '@/components/relatorios/HomeAndPersonalCards';
import { useTags } from '@/hooks/use-tags';
import { useBusinessMetrics } from '@/hooks/use-business-metrics';
import MetricCard from '@/components/relatorios/MetricCard';


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
  
  const yearOptions = generateYearOptions();
  
  // Fetch data for both periods at once
  const { incomes: monthlyIncomes, expenses: monthlyExpenses, loading: monthlyLoading } = useTransactions(activeProfile, { year: selectedYear, month: selectedMonth });
  const { incomes: annualIncomes, expenses: annualExpenses, loading: annualLoading } = useTransactions(activeProfile, { year: selectedYear });
  
  const { hierarchicalTags, loading: tagsLoading } = useTags();
  
  // Calculate metrics for both periods
  const monthlyMetrics = useBusinessMetrics(monthlyIncomes, monthlyExpenses, hierarchicalTags);
  const annualMetrics = useBusinessMetrics(annualIncomes, annualExpenses, hierarchicalTags);

  const loading = monthlyLoading || annualLoading || tagsLoading;

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
    const metricsConfig = [
        {
            id: 'netRevenue', title: text.reports.netRevenue, icon: TrendingUp,
            tooltip: text.reports.netRevenueTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.netRevenue, annualValue: annualMetrics.netRevenue
        },
        {
            id: 'grossProfit', title: text.reports.grossProfit, icon: CircleDollarSign,
            tooltip: text.reports.grossProfitTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.grossProfit, annualValue: annualMetrics.grossProfit,
            subMetrics: [{ title: text.reports.grossMargin, format: 'percent', monthlyValue: monthlyMetrics.grossMargin, annualValue: annualMetrics.grossMargin }]
        },
        {
            id: 'netProfit', title: text.reports.netProfit, icon: DollarSign,
            tooltip: text.reports.netProfitTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.netProfit, annualValue: annualMetrics.netProfit,
            subMetrics: [{ title: text.reports.netMargin, format: 'percent', monthlyValue: monthlyMetrics.netMargin, annualValue: annualMetrics.netMargin }]
        },
        {
            id: 'cmv', title: text.reports.cmv, icon: ShoppingCart,
            tooltip: text.reports.cmvTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.cmv, annualValue: annualMetrics.cmv,
            subMetrics: [{ title: text.reports.costMargin, format: 'percent', monthlyValue: monthlyMetrics.costMargin, annualValue: annualMetrics.costMargin }]
        },
        {
            id: 'fixedCosts', title: text.reports.fixedCosts, icon: ClipboardList,
            tooltip: text.reports.fixedCostsTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.fixedCosts, annualValue: annualMetrics.fixedCosts,
            subMetrics: [{ title: text.reports.fixedCostsMargin, format: 'percent', monthlyValue: monthlyMetrics.fixedCostsMargin, annualValue: annualMetrics.fixedCostsMargin }]
        },
        {
            id: 'impostos', title: text.reports.impostos, icon: Landmark,
            tooltip: text.reports.impostosTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.impostos, annualValue: annualMetrics.impostos,
            subMetrics: [{ title: text.reports.impostosMargin, format: 'percent', monthlyValue: monthlyMetrics.impostosMargin, annualValue: annualMetrics.impostosMargin }]
        },
        {
            id: 'personnelCost', title: text.reports.personnelCost, icon: Users,
            tooltip: text.reports.personnelCostTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.personnelCost, annualValue: annualMetrics.personnelCost,
            subMetrics: [{ title: text.reports.personnelCostMargin, format: 'percent', monthlyValue: monthlyMetrics.personnelCostMargin, annualValue: annualMetrics.personnelCostMargin }]
        },
        {
            id: 'sistema', title: text.reports.sistema, icon: HardDrive,
            tooltip: text.reports.sistemaTooltip, format: 'currency',
            monthlyValue: monthlyMetrics.sistema, annualValue: annualMetrics.sistema,
            subMetrics: [{ title: text.reports.sistemaMargin, format: 'percent', monthlyValue: monthlyMetrics.sistemaMargin, annualValue: annualMetrics.sistemaMargin }]
        },
    ];

    const mainChartMetrics = metricsConfig.slice(0, 4);
    const secondaryMetrics = metricsConfig.slice(4);

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
                 {secondaryMetrics.map(metric => (
                    <MetricCard 
                        key={metric.id}
                        title={metric.title}
                        tooltip={metric.tooltip}
                        icon={metric.icon}
                        monthlyValue={metric.monthlyValue}
                        annualValue={metric.annualValue}
                        formatAs={metric.format as 'currency' | 'percent'}
                        periodLabel={periodLabel}
                        selectedYear={selectedYear}
                        loading={loading}
                        subMetrics={metric.subMetrics}
                    />
                 ))}
              </div>
            </div>

            <div className="lg:col-span-1 space-y-6">
              {mainChartMetrics.map(metric => (
                <MetricCard 
                    key={metric.id}
                    title={metric.title}
                    tooltip={metric.tooltip}
                    icon={metric.icon}
                    monthlyValue={metric.monthlyValue}
                    annualValue={metric.annualValue}
                    formatAs={metric.format as 'currency' | 'percent'}
                    periodLabel={periodLabel}
                    selectedYear={selectedYear}
                    loading={loading}
                    subMetrics={metric.subMetrics}
                />
              ))}
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

    