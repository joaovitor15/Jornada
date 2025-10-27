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
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Loader2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface CategoryData {
  name: string;
  value: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="label font-bold">{`${payload[0].name}`}</p>
        <p className="intro">{
          `Total: ${new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(payload[0].value)}`
        }</p>
      </div>
    );
  }

  return null;
};

export default function DonutChart() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      try {
        setLoading(true);
        const expenses = snapshot.docs
          .map((doc) => ({ ...(doc.data() as Transaction), id: doc.id }))
          .filter(t => t.profile === activeProfile);

        if (expenses.length === 0) {
          setCategoryData([]);
          setLoading(false);
          return;
        }

        const categoryMap = new Map<string, number>();
        expenses.forEach((expense) => {
          const { category, amount } = expense;
          categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
        });

        const formattedData: CategoryData[] = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
        setCategoryData(formattedData);
      } catch (err) {
        setError('Failed to process category data.');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error(err);
      setError('Failed to fetch expenses.');
      setLoading(false);
    });

    return () => unsubscribe();
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
        <CardTitle>Despesas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        {categoryData.length === 0 ? (
          <p className="text-muted-foreground text-center py-10">
            Não há dados de despesas para exibir.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="name"
              >
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
