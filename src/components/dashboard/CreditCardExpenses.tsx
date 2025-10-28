'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface CreditCardExpenseData {
  card: string;
  spent: number;
  limit: number;
}

export default function CreditCardExpenses() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [creditCardData, setCreditCardData] = useState<CreditCardExpenseData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // This is a placeholder. In a real application, you would fetch this data from your database.
    const MOCK_DATA: CreditCardExpenseData[] = [
        { card: 'Mastercard 4321', spent: 1500, limit: 5000 },
        { card: 'Visa 9876', spent: 2500, limit: 10000 },
        { card: 'Amex 1234', spent: 800, limit: 7500 },
    ];

    setCreditCardData(MOCK_DATA);
    setLoading(false);

  }, [user, activeProfile]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gastos com Cartões de Crédito</CardTitle>
      </CardHeader>
      <CardContent>
        {creditCardData.map((data, index) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium">{data.card}</span>
              <div>
                <span className="text-sm font-medium">
                  {`${((data.spent / data.limit) * 100).toFixed(0)}%`}
                </span>
                <span className="text-sm text-muted-foreground ml-2">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.spent)}
                </span>
              </div>
            </div>
            <Progress value={(data.spent / data.limit) * 100} className="w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
