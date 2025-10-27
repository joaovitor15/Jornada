'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { format } from 'date-fns';
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

    const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
      const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        try {
          const monthlyData = new Map<string, ChartData>();
          const incomes = incomesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'income' })) as Transaction[];
          const expenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense' })) as Transaction[];
          const transactions = [...incomes, ...expenses];

          const filteredTransactions = transactions.filter(t => t.profile === activeProfile);

          filteredTransactions.forEach((transaction) => {
            const date = new Date(transaction.date);
            const monthKey = format(date, 'yyyy-MM');
            const monthName = format(date, 'MMM yyyy', { locale: ptBR });

            if (!monthlyData.has(monthKey)) {
              monthlyData.set(monthKey, { month: monthName, monthKey, income: 0, expense: 0 });
            }

            const entry = monthlyData.get(monthKey)!;
            if (transaction.type === 'income') {
              entry.income += transaction.amount;
            } else {
              entry.expense += transaction.amount;
            }
          });

          const sortedData = Array.from(monthlyData.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
          setChartData(sortedData);
        } catch (err) {
          setError('Failed to process chart data.');
        } finally {
          setLoading(false);
        }
      }, (err) => {
        console.error(err);
        setError('Failed to fetch expenses.');
        setLoading(false);
      });

      return () => unsubscribeExpenses();
    }, (err) => {
      console.error(err);
      setError('Failed to fetch incomes.');
      setLoading(false);
    });

    return () => unsubscribeIncomes();
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

  if (chartData.length < 2) {
    return (
      <p className="text-muted-foreground text-center py-10">
        Não há dados suficientes para exibir o gráfico.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resumo Financeiro</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis
              width={80}
              tickFormatter={(value) =>
                new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                }).format(value)
              }
              tick={{ fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend verticalAlign="top" align="right" />
            <Line type="monotone" dataKey="income" stroke="#4CAF50" name="Receita" strokeWidth={2} />
            <Line type="monotone" dataKey="expense" stroke="#FF7300" name="Despesa" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
