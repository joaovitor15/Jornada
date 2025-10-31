'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
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
        {payload[0] && (
          <p className="intro text-green-500">{`${text.summary.income}: ${new Intl.NumberFormat(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          ).format(payload[0].value)}`}</p>
        )}
        {payload[1] && (
          <p className="intro text-red-500">{`${text.summary.expenses}: ${new Intl.NumberFormat(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          ).format(payload[1].value)}`}</p>
        )}
      </div>
    );
  }
  return null;
};

export default function FinancialChart({
  year,
  onMonthSelect,
}: FinancialChartProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animationKey = useMemo(() => `${year}-${activeProfile}`, [year, activeProfile]);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const baseQuery = (collectionName: string) =>
      query(collection(db, collectionName), where('userId', '==', user.uid), where('profile', '==', activeProfile));
      
    const incomesQuery = baseQuery('incomes');
    const expensesQuery = baseQuery('expenses');
    const billPaymentsQuery = baseQuery('billPayments');

    const handleSnapshots = (
      incomesSnapshot: any,
      expensesSnapshot: any,
      billPaymentsSnapshot: any
    ) => {
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

        const processTransactions = (snapshot: any, type: 'income' | 'expense' | 'billPayment') => {
            snapshot.docs.forEach((doc: any) => {
                const transaction = { ...doc.data(), id: doc.id } as Transaction | BillPayment;
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

        processTransactions(incomesSnapshot, 'income');
        processTransactions(expensesSnapshot, 'expense');
        processTransactions(billPaymentsSnapshot, 'billPayment');

        const sortedData = Array.from(monthlyData.values()).sort((a, b) =>
          a.monthKey.localeCompare(b.monthKey)
        );
        
        setChartData(sortedData);
      } catch (err) {
        console.error(err);
        setError(text.reports.chartError);
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const unsubscribeExpenses = onSnapshot(
        expensesQuery,
        (expensesSnapshot) => {
          const unsubscribeBillPayments = onSnapshot(
            billPaymentsQuery,
            (billPaymentsSnapshot) => {
              handleSnapshots(incomesSnapshot, expensesSnapshot, billPaymentsSnapshot);
            },
            (err) => {
              console.error(err);
              setError(text.billPaymentsList.fetchError);
              setLoading(false);
            }
          );
          return () => unsubscribeBillPayments();
        },
        (err) => {
          console.error(err);
          setError(text.expensesList.fetchError);
          setLoading(false);
        }
      );
      return () => unsubscribeExpenses();
    }, (err) => {
      console.error(err);
      setError(text.incomesList.fetchError);
      setLoading(false);
    });

    return () => {
      unsubscribeIncomes();
    };
  }, [user, activeProfile, year]);

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
