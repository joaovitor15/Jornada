'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BarChartData {
  name: string;
  percentage: number;
}

export default function CategoryExpenseBarChart() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [barChartData, setBarChartData] = useState<BarChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('profile', '==', activeProfile));
    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', user.uid), where('profile', '==', activeProfile));

    const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
            const expenses = expensesSnapshot.docs.map(doc => doc.data() as Transaction);
            const incomes = incomesSnapshot.docs.map(doc => doc.data() as Transaction);
            const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);

            const groupedExpenses = expenses.reduce((acc, curr) => {
                const category = curr.mainCategory;
                if (!acc[category]) {
                acc[category] = 0;
                }
                acc[category] += curr.amount;
                return acc;
            }, {} as { [key: string]: number });

            const data: BarChartData[] = Object.entries(groupedExpenses).map(([name, value]) => ({
                name,
                percentage: totalIncome > 0 ? (value / totalIncome) * 100 : 0,
            })).sort((a, b) => b.percentage - a.percentage);

            setBarChartData(data);
            setLoading(false);
        });
        return () => unsubscribeIncomes();
    });

    return () => unsubscribeExpenses();
  }, [user, activeProfile]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
        <CardHeader>
            <CardTitle>% por categoria de gasto em relação a receita</CardTitle>
        </CardHeader>
        <CardContent>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barChartData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis hide={true} />
                    <Tooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Porcentagem']} />
                    <Bar dataKey="percentage" fill="#FF8042" >
                        <LabelList dataKey="percentage" position="top" formatter={(value: number) => `${value.toFixed(1)}%`} fontSize={12} />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </CardContent>
    </Card>
  );
}
