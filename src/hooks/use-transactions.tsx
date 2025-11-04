
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Expense, Income, Profile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';

export function useTransactions(activeProfile: Profile | null) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setExpenses([]);
      setIncomes([]);
      return;
    }

    setLoading(true);

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('date', 'desc')
    );

    const incomesQuery = query(
      collection(db, 'incomes'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      orderBy('date', 'desc')
    );

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (querySnapshot) => {
        const expensesData: Expense[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            expensesData.push({ id: doc.id, ...data } as Expense);
          }
        });
        setExpenses(expensesData);
        if (!loading) setLoading(false);
      },
      (error) => {
        console.error('Error fetching expenses: ', error);
        toast({
          variant: 'destructive',
          title: text.common.error,
          description: text.expensesList.fetchError,
        });
        setLoading(false);
      }
    );

    const unsubscribeIncomes = onSnapshot(
      incomesQuery,
      (querySnapshot) => {
        const incomesData: Income[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            incomesData.push({ id: doc.id, ...data } as Income);
          }
        });
        setIncomes(incomesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching incomes: ', error);
        toast({
          variant: 'destructive',
          title: text.common.error,
          description: text.incomesList.fetchError,
        });
        setLoading(false);
      }
    );

    return () => {
      unsubscribeExpenses();
      unsubscribeIncomes();
    };
  }, [user, activeProfile, toast]);

  return { expenses, incomes, loading };
}
