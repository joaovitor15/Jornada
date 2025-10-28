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
import { Transaction } from '@/lib/types';
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

interface ChartData {
  month: string;
  monthKey: string;
  income: number;
  expense: number;
}

type TransactionTypeFilter = 'all' | 'income' | 'expense';

interface FinancialChartProps {
  year: number;
  transactionType: TransactionTypeFilter;
}

const CustomTooltip = ({ active, payload, label, transactionType }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="label font-bold">{`${label}`}</p>
        {(transactionType === 'all' || transactionType === 'income') && payload[0] && (
          <p className="intro text-green-500">{`Receita: ${new Intl.NumberFormat(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          ).format(payload[0].value)}`}</p>
        )}
        {(transactionType === 'all' || transactionType === 'expense') && payload[transactionType === 'all' ? 1 : 0] && (
          <p className="intro text-red-500">{`Despesa: ${new Intl.NumberFormat(
            'pt-BR',
            {
              style: 'currency',
              currency: 'BRL',
            }
          ).format(payload[transactionType === 'all' ? 1 : 0].value)}`}</p>
        )}
      </div>
    );
  }

  return null;
};

export default function FinancialChart({
  year,
  transactionType,
}: FinancialChartProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const animationKey = useMemo(() => `${year}-${transactionType}-${activeProfile}`, [year, transactionType, activeProfile]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const incomesQuery = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid)
    );
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid)
    );

    const handleSnapshots = (incomesSnapshot: any, expensesSnapshot: any) => {
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

        const processTransactions = (snapshot: any, type: 'income' | 'expense') => {
            snapshot.docs.forEach((doc: any) => {
                const transaction = { ...doc.data(), id: doc.id, type } as Transaction;
                if (transaction.profile !== activeProfile) return;

                const date = (transaction.date as unknown as Timestamp).toDate();
                if (getYear(date) !== year) return;
                
                const monthKey = format(date, 'yyyy-MM');
                const entry = monthlyData.get(monthKey);
                if (entry) {
                    if (type === 'income') {
                        entry.income += transaction.amount;
                    } else {
                        entry.expense += transaction.amount;
                    }
                }
            });
        };

        if (transactionType === 'all' || transactionType === 'income') {
            processTransactions(incomesSnapshot, 'income');
        }
        if (transactionType === 'all' || transactionType === 'expense') {
            processTransactions(expensesSnapshot, 'expense');
        }

        const sortedData = Array.from(monthlyData.values()).sort((a, b) =>
          a.monthKey.localeCompare(b.monthKey)
        );
        
        setChartData(sortedData);
      } catch (err) {
        console.error(err);
        setError('Falha ao processar os dados do gráfico.');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const unsubscribeExpenses = onSnapshot(
        expensesQuery,
        (expensesSnapshot) => {
          handleSnapshots(incomesSnapshot, expensesSnapshot);
        },
        (err) => {
          console.error(err);
          setError('Falha ao buscar despesas.');
          setLoading(false);
        }
      );
      return () => unsubscribeExpenses();
    }, (err) => {
      console.error(err);
      setError('Falha ao buscar receitas.');
      setLoading(false);
    });

    return () => {
      unsubscribeIncomes();
    };
  }, [user, activeProfile, year, transactionType]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }
  
  const noData = chartData.every(d => d.income === 0 && d.expense === 0);

  if (noData) {
    return <div className="flex justify-center items-center h-full text-muted-foreground">Nenhum dado encontrado para o ano selecionado.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280} key={animationKey}>
      <AreaChart
        data={chartData}
        margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
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
              maximumFractionDigits: 0,
              notation: 'compact',
            }).format(value)
          }
          tick={{ fontSize: 12 }}
          tickCount={6}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip transactionType={transactionType} />} />
        <Legend
          verticalAlign="top"
          align="right"
          iconSize={14}
          wrapperStyle={{ fontSize: '14px', top: '0px' }}
        />
        {(transactionType === 'all' || transactionType === 'income') && (
          <Area
            type="monotone"
            dataKey="income"
            stroke="#4CAF50"
            fill="url(#colorIncome)"
            name="Receita"
            strokeWidth={2}
          />
        )}
        {(transactionType === 'all' || transactionType === 'expense') && (
          <Area
            type="monotone"
            dataKey="expense"
            stroke="#FF7300"
            fill="url(#colorExpense)"
            name="Despesa"
            strokeWidth={2}
          />
        )}
      </AreaChart>
    </ResponsiveContainer>
  );
}
