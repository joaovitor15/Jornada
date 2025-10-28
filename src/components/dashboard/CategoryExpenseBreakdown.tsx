'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { Progress } from '@/components/ui/progress';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

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
    <div className="grid grid-cols-5 gap-4 items-center">
        <div className="col-span-3">
            {categoryData.map((category, index) => (
                <div key={index} className="grid grid-cols-2 grid-rows-2 gap-x-2 mb-1">
                    <div className="text-xs truncate">{category.name}</div>
                    <div className="text-xs font-semibold text-right">{`${category.percentage.toFixed(1)}%`}</div>
                    <div className="pr-2">
                        <Progress value={category.percentage} className="h-1" />
                    </div>
                    <div className="text-xs text-muted-foreground text-right">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(category.value)}
                    </div>
                </div>
            ))}
        </div>
        <div className="col-span-2 flex justify-center items-center">
            <ResponsiveContainer width="100%" height={100}>
                <PieChart>
                    <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={40}
                        dataKey="value"
                        startAngle={90}
                        endAngle={450}
                    >
                        <Cell fill="#FF8042" />
                    </Pie>
                    <foreignObject x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" width="100px" height="100px" style={{ transform: 'translate(-50px, -50px)' }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', fontSize: '18px', fontWeight: 'bold' }}>
                            {`${Math.round(expenseIncomeRatio)}%`}
                        </div>
                    </foreignObject>
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
}
