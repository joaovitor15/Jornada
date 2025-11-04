
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Transaction, BillPayment, Income } from '@/lib/types';
import {
  format,
  getYear,
  startOfYear,
  endOfYear,
  eachMonthOfInterval,
  setYear,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import { text } from '@/lib/strings';
import { useTransactions } from '@/hooks/use-transactions';
import { useProfile } from '@/hooks/use-profile';
import { Timestamp } from 'firebase/firestore';


interface ChartData {
  month: string;
  monthKey: string; // "yyyy-MM"
  income: number;
  expense: number;
}

interface FinancialChartProps {
  year: number;
  onMonthSelect: (month: number) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="label font-bold">{`${label}`}</p>
        {payload.map((pld: any) => (
          <p key={pld.name} style={{ color: pld.color }}>
            {`${pld.name}: ${new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }).format(pld.value)}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function FinancialChart({
  year,
  onMonthSelect,
}: FinancialChartProps) {
  const { activeProfile } = useProfile();
  const { incomes, expenses, billPayments, loading } = useTransactions(activeProfile);
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [error, setError] = useState<string | null>(null);

  const animationKey = useMemo(() => `${year}-${activeProfile}`, [year, activeProfile]);

  useEffect(() => {
    if (loading) return;
    
    try {
        const yearDate = setYear(new Date(), year);
        const startDate = startOfYear(yearDate);
        const endDate = endOfYear(yearDate);
        
        const interval = { start: startDate, end: endDate };
        const monthsInInterval = eachMonthOfInterval(interval);

        const monthlyData = new Map<string, ChartData>();
        monthsInInterval.forEach(monthDate => {
            const monthKey = format(monthDate, 'yyyy-MM');
            const monthName = format(monthDate, 'MMM', { locale: ptBR });
            monthlyData.set(monthKey, {
                month: monthName.charAt(0).toUpperCase() + monthName.slice(1),
                monthKey,
                income: 0,
                expense: 0,
            });
        });

        const processTransactions = (transactions: (Income | Expense | BillPayment)[], type: 'income' | 'expense' | 'billPayment') => {
            transactions.forEach((transaction) => {
                const date = (transaction.date as unknown as Timestamp).toDate();
                if (getYear(date) !== year) return;
                
                const monthKey = format(date, 'yyyy-MM');
                const entry = monthlyData.get(monthKey);
                if (entry) {
                    if (type === 'income') {
                      const income = transaction as Income;
                      if (income.subcategory !== text.businessCategories.pfpbSubcategory) {
                        entry.income += transaction.amount;
                      }
                    } else if (type === 'expense') {
                      if (!(transaction as Transaction).paymentMethod.startsWith('Cartão:')) {
                        entry.expense += transaction.amount;
                      }
                    } else if (type === 'billPayment') {
                        entry.expense += transaction.amount;
                    }
                }
            });
        };

        processTransactions(incomes, 'income');
        processTransactions(expenses, 'expense');
        processTransactions(billPayments, 'billPayment');

        const sortedData = Array.from(monthlyData.values()).sort((a, b) =>
          a.monthKey.localeCompare(b.monthKey)
        );
        
        setChartData(sortedData);
      } catch (err) {
        console.error(err);
        setError(text.reports.chartError);
      }
  }, [incomes, expenses, billPayments, loading, year, activeProfile]);

  const handleChartClick = (data: any) => {
    if (data && data.activePayload && data.activePayload.length > 0) {
      const monthKey = data.activePayload[0].payload.monthKey; // "yyyy-MM"
      const monthIndex = parseInt(monthKey.split('-')[1], 10) - 1;
      onMonthSelect(monthIndex);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[280px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }
  
  const noData = chartData.every(d => d.income === 0 && d.expense === 0);

  if (noData) {
    return <div className="flex justify-center items-center h-full min-h-[280px] text-muted-foreground">{text.reports.noData}</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280} key={animationKey}>
      <AreaChart
        data={chartData}
        margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
        onClick={handleChartClick}
      >
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4CAF50" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#4CAF50" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF7300" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#FF7300" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.3} />
        <XAxis
          dataKey="month"
          interval={0}
          tick={{ fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          width={80}
          tickFormatter={(value) =>
            new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            }).format(value)
          }
          tick={{ fontSize: 12 }}
          tickCount={6}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="top"
          align="right"
          iconSize={14}
          wrapperStyle={{ fontSize: '14px', top: '0px' }}
        />
        <Area
          type="monotone"
          dataKey="income"
          stroke="#4CAF50"
          fill="url(#colorIncome)"
          name={text.summary.income}
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stroke="#FF7300"
          fill="url(#colorExpense)"
          name={text.summary.expenses}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

    