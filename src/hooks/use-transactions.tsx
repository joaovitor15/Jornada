'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Expense, Income, BillPayment, Profile } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { text } from '@/lib/strings';
import { startOfMonth, endOfMonth, startOfYear, endOfYear, getYear } from 'date-fns';

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
  const [availableYears, setAvailableYears] = useState<number[]>([new Date().getFullYear()]);
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
      if (period.month !== undefined && period.month >= 0) {
        startDate = startOfMonth(new Date(period.year, period.month));
        endDate = endOfMonth(new Date(period.year, period.month));
      } else {
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
    
    // Query to get all available years from expenses
    const yearsQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile)
    );

    getDocs(yearsQuery).then(snapshot => {
      const yearsWithData = new Set(
        snapshot.docs
          .map((doc) => (doc.data().date ? getYear((doc.data().date as Timestamp).toDate()) : null))
          .filter(Boolean) as number[]
      );
      const currentYear = new Date().getFullYear();
      yearsWithData.add(currentYear);
      const sortedYears = Array.from(yearsWithData).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
    });

    const expensesQuery = buildQuery('expenses');
    const incomesQuery = buildQuery('incomes');
    const billPaymentsQuery = buildQuery('billPayments');

    const handleSnapshot = <T extends { date: Timestamp }>(
      snapshot: any,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const data: T[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as T));
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

    const unsubExpenses = onSnapshot(expensesQuery, (snap) => handleSnapshot(snap, setExpenses), (err) => handleError(err, 'despesas'));
    const unsubIncomes = onSnapshot(incomesQuery, (snap) => handleSnapshot(snap, setIncomes), (err) => handleError(err, 'receitas'));
    const unsubBillPayments = onSnapshot(billPaymentsQuery, (snap) => handleSnapshot(snap, setBillPayments), (err) => handleError(err, 'pagamentos de fatura'));
    
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

  return { expenses, incomes, billPayments, loading, availableYears };
}
