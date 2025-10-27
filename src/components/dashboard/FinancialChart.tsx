'use client';

import { useEffect, useState } from 'react';
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
import { format, getYear, setMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Line,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface ChartData {
  month: string;
  monthKey: string;
  income: number;
  expense: number;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="label font-bold">{`${label}`}</p>
        <p className="intro text-green-500">{
          `Receita: ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(payload[0].value)}`
        }</p>
        <p className="intro text-red-500">{
          `Despesa: ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(payload[1].value)}`
        }</p>
      </div>
    );
  }

  return null;
};

export default function FinancialChart() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

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
        setLoading(true);
        const monthlyData = new Map<string, ChartData>();
        const currentYear = getYear(new Date());

        for (let i = 0; i < 12; i++) {
          const monthDate = setMonth(new Date(currentYear, 0, 1), i);
          const monthKey = format(monthDate, 'yyyy-MM');
          const monthName = format(monthDate, 'MMM', { locale: ptBR });
          monthlyData.set(monthKey, { month: monthName.charAt(0).toUpperCase() + monthName.slice(1), monthKey, income: 0, expense: 0 });
        }

        const incomes = incomesSnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id, type: 'income' })) as Transaction[];
        const expenses = expensesSnapshot.docs.map((doc: any) => ({ ...doc.data(), id: doc.id, type: 'expense' })) as Transaction[];
        const transactions = [...incomes, ...expenses];

        const filteredTransactions = transactions.filter(t => t.profile === activeProfile);

        filteredTransactions.forEach((transaction) => {
          const date = (transaction.date as unknown as Timestamp).toDate();
          if (getYear(date) !== currentYear) return;
          
          const monthKey = format(date, 'yyyy-MM');
          const entry = monthlyData.get(monthKey);

          if (entry) {
            if (transaction.type === 'income') {
              entry.income += transaction.amount;
            } else {
              entry.expense += transaction.amount;
            }
          }
        });

        const sortedData = Array.from(monthlyData.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
        setChartData(sortedData);
      } catch (err) {
        setError('Failed to process chart data.');
      } finally {
        setLoading(false);
      }
    };

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        handleSnapshots(incomesSnapshot, expensesSnapshot);
      });
      return () => unsubscribeExpenses();
    }, (err) => {
      console.error(err);
      setError('Failed to fetch incomes.');
      setLoading(false);
    });

    return () => {
      unsubscribeIncomes();
    };
  }, [user, activeProfile]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500 text-center py-10">{error}</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.5} />
            <XAxis 
              dataKey="month" 
              interval={0}
              tick={{ fontSize: 10 }} 
              angle={-30}
              textAnchor="end"
              height={50}
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
                }).format(value)
              }
              tick={{ fontSize: 10 }}
              tickCount={5}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconSize={12}
              wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
            />
            <Line type="monotone" dataKey="income" stroke="#4CAF50" name="Receita" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="expense" stroke="#FF7300" name="Despesa" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
