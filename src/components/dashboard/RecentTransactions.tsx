'use client';

import { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Transaction } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function RecentTransactions() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const expensesQuery = query(
        collection(db, 'expenses'), 
        where('userId', '==', user.uid), 
        where('profile', '==', activeProfile), 
        orderBy('date', 'desc'),
        limit(5)
    );
    const incomesQuery = query(
        collection(db, 'incomes'), 
        where('userId', '==', user.uid), 
        where('profile', '==', activeProfile), 
        orderBy('date', 'desc'),
        limit(5)
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
        const unsubscribeIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
            const expenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense' })) as Transaction[];
            const incomes = incomesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'income' })) as Transaction[];

            const combined = [...expenses, ...incomes]
                .sort((a, b) => b.date.toMillis() - a.date.toMillis())
                .slice(0, 7);

            setTransactions(combined);
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
        <CardTitle>Transações Recentes</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map(t => (
              <TableRow key={t.id}>
                <TableCell className="font-medium flex items-center gap-2">
                    {t.type === 'income' ? <ArrowUpCircle className="text-green-500" /> : <ArrowDownCircle className="text-red-500" />}
                    {t.description || 'N/A'}
                </TableCell>
                <TableCell>{t.mainCategory}</TableCell>
                <TableCell>{new Intl.DateTimeFormat('pt-BR').format(t.date.toDate())}</TableCell>
                <TableCell className={`text-right font-semibold ${t.type === 'income' ? 'text-green-500' : 'text-red-500'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {transactions.length === 0 && (
            <p className="text-center text-sm text-muted-foreground mt-4">Não há transações recentes.</p>
        )}
      </CardContent>
    </Card>
  );
}
