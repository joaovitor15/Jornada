
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
import { Expense, Income, BillPayment, Profile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';

export function useTransactions(activeProfile: Profile | null) {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [billPayments, setBillPayments] = useState<BillPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setExpenses([]);
      setIncomes([]);
      setBillPayments([]);
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
    
    const billPaymentsQuery = query(
      collection(db, 'billPayments'),
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
    
    const unsubscribeBillPayments = onSnapshot(billPaymentsQuery, (querySnapshot) => {
       const paymentsData: BillPayment[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.date) {
            paymentsData.push({ id: doc.id, ...data } as BillPayment);
          }
        });
        setBillPayments(paymentsData);
    },
    (error) => {
      console.error('Error fetching bill payments: ', error);
    });

    // Combine loading state management
    Promise.all([
      new Promise(resolve => onSnapshot(expensesQuery, () => resolve(true))),
      new Promise(resolve => onSnapshot(incomesQuery, () => resolve(true))),
      new Promise(resolve => onSnapshot(billPaymentsQuery, () => resolve(true)))
    ]).then(() => {
      setLoading(false);
    });


    return () => {
      unsubscribeExpenses();
      unsubscribeIncomes();
      unsubscribeBillPayments();
    };
  }, [user, activeProfile, toast]);

  return { expenses, incomes, billPayments, loading };
}
