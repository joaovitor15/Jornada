'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6666', '#66FF66', '#6666FF'];

export default function CategoryExpenseBreakdown() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpense, setTotalExpense] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('profile', '==', activeProfile));
    const incomesQuery = query(collection(db, 'incomes'), where('userId', '==', user.uid), where('profile', '==', activeProfile));

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const expenses = snapshot.docs.map(doc => doc.data() as Transaction);
      const total = expenses.reduce((acc, curr) => acc + curr.amount, 0);
      setTotalExpense(total);

      const groupedExpenses = expenses.reduce((acc, curr) => {
        const category = curr.mainCategory;
        if (!acc[category]) {
          acc[category] = 0;
        }
        acc[category] += curr.amount;
        return acc;
      }, {} as { [key: string]: number });

      const data: CategoryData[] = Object.entries(groupedExpenses).map(([name, value]) => ({
        name,
        value,
        percentage: total > 0 ? (value / total) * 100 : 0,
      })).sort((a, b) => b.value - a.value);

      setCategoryData(data);
      setLoading(false);
    });

    const unsubscribeIncomes = onSnapshot(incomesQuery, (snapshot) => {
        const incomes = snapshot.docs.map(doc => doc.data() as Transaction);
        const total = incomes.reduce((acc, curr) => acc + curr.amount, 0);
        setTotalIncome(total);
    });

    return () => {
        unsubscribeExpenses();
        unsubscribeIncomes();
    }

  }, [user, activeProfile]);

  const expenseIncomeRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const donutData = [{ name: 'Expenses', value: expenseIncomeRatio }];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            {categoryData.map((category, index) => (
                <div key={index} className="mb-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{category.name}</span>
                        <span className="text-sm font-medium">{category.percentage.toFixed(2)}%</span>
                    </div>
                    <Progress value={category.percentage} className="w-full" />
                    <div className="text-right text-sm text-muted-foreground">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(category.value)}
                    </div>
                </div>
            ))}
        </div>
        <div className="flex justify-center items-center">
            <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                    <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                    >
                        <Cell fill="#FF8042" />
                    </Pie>
                    <foreignObject x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" width="100px" height="100px" style={{ transform: 'translate(-50px, -50px)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', fontSize: '24px', fontWeight: 'bold' }}>
                            {`${Math.round(expenseIncomeRatio)}%`}
                        </div>
                    </foreignObject>
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
