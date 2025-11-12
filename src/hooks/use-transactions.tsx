
'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Expense, Income, BillPayment, Profile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import { startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

type Period = {
  year: number;
  month?: number;
};

export function useTransactions(activeProfile: Profile | null, period?: Period) {
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

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (period) {
      if (period.month !== undefined) {
        // Monthly period
        startDate = startOfMonth(new Date(period.year, period.month));
        endDate = endOfMonth(new Date(period.year, period.month));
      } else {
        // Annual period
        startDate = startOfYear(new Date(period.year, 0));
        endDate = endOfYear(new Date(period.year, 11));
      }
    }

    const buildQuery = (collectionName: string) => {
      let q = query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile)
      );

      if (startDate && endDate) {
        q = query(
          q,
          where('date', '>=', Timestamp.fromDate(startDate)),
          where('date', '<=', Timestamp.fromDate(endDate))
        );
      }
      return q;
    };
    
    const expensesQuery = buildQuery('expenses');
    const incomesQuery = buildQuery('incomes');
    const billPaymentsQuery = buildQuery('billPayments');

    const handleSnapshot = <T extends { date: Timestamp }>(
      snapshot: any,
      setter: React.Dispatch<React.SetStateAction<T[]>>,
      collectionName: string
    ) => {
      const data: T[] = [];
      snapshot.forEach((doc: any) => {
        const docData = doc.data();
        if (docData.date) {
          data.push({ id: doc.id, ...docData } as T);
        }
      });
      // Sort on the client side to avoid composite index issues
      data.sort((a, b) => b.date.toMillis() - a.date.toMillis());
      setter(data);
    };

    const handleError = (error: Error, collectionName: string) => {
        console.error(`Error fetching ${collectionName}: `, error);
        toast({
            variant: 'destructive',
            title: text.common.error,
            description: `Falha ao buscar dados de ${collectionName}.`,
        });
    };

    const unsubExpenses = onSnapshot(expensesQuery, 
        (snap) => handleSnapshot<Expense>(snap, setExpenses, 'despesas'), 
        (err) => handleError(err, 'despesas')
    );

    const unsubIncomes = onSnapshot(incomesQuery, 
        (snap) => handleSnapshot<Income>(snap, setIncomes, 'receitas'), 
        (err) => handleError(err, 'receitas')
    );

    const unsubBillPayments = onSnapshot(billPaymentsQuery, 
        (snap) => handleSnapshot<BillPayment>(snap, setBillPayments, 'pagamentos de fatura'), 
        (err) => handleError(err, 'pagamentos de fatura')
    );
    
    // Manage loading state
    const loadingPromises = [
      new Promise(resolve => onSnapshot(expensesQuery, () => resolve(true), () => resolve(true))),
      new Promise(resolve => onSnapshot(incomesQuery, () => resolve(true), () => resolve(true))),
      new Promise(resolve => onSnapshot(billPaymentsQuery, () => resolve(true), () => resolve(true)))
    ];

    Promise.all(loadingPromises).then(() => {
      setLoading(false);
    });

    return () => {
      unsubExpenses();
      unsubIncomes();
      unsubBillPayments();
    };
  }, [user, activeProfile, period?.year, period?.month, toast]);

  return { expenses, incomes, billPayments, loading };
}
