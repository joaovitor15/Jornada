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
import { getYear } from 'date-fns';
import { getMonthPeriod, getYearPeriod } from '@/lib/date-utils';


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

    let dateFilter: { startDate: Date; endDate: Date } | null = null;
    if (period) {
      if (period.month !== undefined && period.month >= 0) {
        dateFilter = getMonthPeriod(period.year, period.month);
      } else if (period.year) {
        dateFilter = getYearPeriod(period.year);
      }
    }


    const buildQuery = (collectionName: string) => {
      let q = query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile)
      );

      if (dateFilter) {
        q = query(
          q,
          where('date', '>=', Timestamp.fromDate(dateFilter.startDate)),
          where('date', '<=', Timestamp.fromDate(dateFilter.endDate))
        );
      }
      return q;
    };
    
    // Query to get all available years from all transactions
    const fetchAvailableYears = async () => {
      const collectionsToSearch = ['expenses', 'incomes', 'billPayments'];
      const yearsWithData = new Set<number>();

      for (const col of collectionsToSearch) {
          const q = query(
              collection(db, col),
              where('userId', '==', user.uid),
              where('profile', '==', activeProfile)
          );
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
              const data = doc.data();
              if (data.date) {
                  yearsWithData.add(getYear((data.date as Timestamp).toDate()));
              }
          });
      }
      
      const currentYear = new Date().getFullYear();
      yearsWithData.add(currentYear);
      const sortedYears = Array.from(yearsWithData).sort((a, b) => b - a);
      setAvailableYears(sortedYears);
    };

    fetchAvailableYears();
    
    const expensesQuery = buildQuery('expenses');
    const incomesQuery = buildQuery('incomes');
    const billPaymentsQuery = buildQuery('billPayments');

    const handleSnapshot = <T extends { date: Timestamp }>(
      snapshot: any,
      setter: React.Dispatch<React.SetStateAction<T[]>>
    ) => {
      const data: T[] = snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() } as T));
      // A ordenação é feita no cliente para evitar a necessidade de índices compostos complexos no Firestore
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
