'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface CategoryData {
  name: string;
  value: number;
  percentage: number;
}

const ProgressBarWithLabel = ({ value }: { value: number }) => {
  const displayValue = value.toFixed(1);
  return (
    <div className="w-full bg-slate-200 rounded-full h-4 relative text-center">
      <div
        className="bg-blue-500 h-4 rounded-full"
        style={{ width: `${value}%` }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
        {displayValue}%
      </span>
    </div>
  );
};


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
        unsubscribeExpenses();n        unsubscribeIncomes();
    }

  }, [user, activeProfile]);

  const expenseIncomeRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
  const donutData = [{ name: 'Expenses', value: expenseIncomeRatio }];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="flex gap-4 h-full">
      <div className="w-3/5 overflow-y-auto pr-2">
        {categoryData.length > 0 ? (
            categoryData.map((category, index) => (
                <div key={index} className="mb-2 flex-shrink-0">
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="truncate font-medium">{category.name}</span>
                        <span className="text-muted-foreground font-semibold">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(category.value)}
                        </span>
                    </div>
                    <ProgressBarWithLabel value={category.percentage} />
                </div>
            ))
        ) : (
            <div className="flex items-center justify-center h-full">
                <p className="text-center text-sm text-muted-foreground">
                    Sem despesas nesta categoria.
                </p>
            </div>
        )}
      </div>
      <div className="w-2/5 flex justify-center items-center">
        <ResponsiveContainer width="100%" height={120}>
          <PieChart>
            <Pie
              data={donutData}
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={45}
              dataKey="value"
              startAngle={90}
              endAngle={450}
            >
              <Cell fill="#FF8042" />
            </Pie>
            <foreignObject x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" width="100px" height="100px" style={{ transform: 'translate(-50px, -50px)' }}>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', fontSize: '20px', fontWeight: 'bold' }}>
                {`${Math.round(expenseIncomeRatio)}%`}
              </div>
            </foreignObject>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
