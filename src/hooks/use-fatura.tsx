
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  getDocs,
} from 'firebase/firestore';
import { Card as CardType, Expense, BillPayment } from '@/lib/types';
import { getFaturaPeriod, getFaturaStatus, getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';
import { subMonths, addMonths } from 'date-fns';

type FaturaTransaction = (Expense | BillPayment) & { transactionType: 'expense' | 'payment' | 'refund' };

export function useFatura(card: CardType, selectedFatura: { month: number; year: number }) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FaturaTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [fechamento, setFechamento] = useState<Date | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);

  const getMonthBalance = useCallback(async (
    localUser: any, 
    localProfile: string, 
    localCard: CardType, 
    month: number, 
    year: number
  ) => {
    const { startDate, endDate, closingDate } = getFaturaPeriod(year, month, localCard.closingDay, localCard.dueDay);
    const prevFaturaPeriod = getFaturaPeriod(subMonths(closingDate, 1).getFullYear(), subMonths(closingDate, 1).getMonth(), localCard.closingDay, localCard.dueDay);

    const expensesQuery = getDocs(query(collection(db, 'expenses'), where('userId', '==', localUser.uid), where('profile', '==', localProfile), where('paymentMethod', '==', `Cartão: ${localCard.name}`), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate))));
    const refundsQuery = getDocs(query(collection(db, 'billPayments'), where('userId', '==', localUser.uid), where('profile', '==', localProfile), where('cardId', '==', localCard.id), where('type', '==', 'refund'), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate))));
    const paymentsQuery = getDocs(query(collection(db, 'billPayments'), where('userId', '==', localUser.uid), where('profile', '==', localProfile), where('cardId', '==', localCard.id), where('type', '==', 'payment'), where('date', '>', Timestamp.fromDate(prevFaturaPeriod.closingDate)), where('date', '<=', Timestamp.fromDate(closingDate))));

    const [expensesSnap, refundsSnap, paymentsSnap] = await Promise.all([expensesQuery, refundsQuery, paymentsQuery]);

    const totalExpenses = expensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
    const totalRefunds = refundsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
    const totalPayments = paymentsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
    const faturaValue = totalExpenses - totalRefunds;

    return { faturaValue, totalPayments };
  }, []);

  useEffect(() => {
    if (!user || !activeProfile || !card) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const calculateFaturaData = async () => {
      // 1. Calculate previous month's credit
      const prevFaturaDate = subMonths(new Date(selectedFatura.year, selectedFatura.month), 1);
      const { faturaValue: prevFaturaValue, totalPayments: prevTotalPayments } = await getMonthBalance(user, activeProfile, card, prevFaturaDate.getMonth(), prevFaturaDate.getFullYear());
      const creditFromPreviousMonth = Math.max(0, prevTotalPayments - prevFaturaValue);

      // 2. Get current month's data
      const { startDate, endDate, closingDate, dueDate } = getFaturaPeriod(selectedFatura.year, selectedFatura.month, card.closingDay, card.dueDay);
      setFechamento(closingDate);
      setVencimento(dueDate);

      // 3. Set up listeners for current month transactions
      const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('paymentMethod', '==', `Cartão: ${card.name}`), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate)), orderBy('date', 'desc'));
      const refundsQuery = query(collection(db, 'billPayments'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('cardId', '==', card.id), where('type', '==', 'refund'), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate)));
      
      const nextFaturaPeriod = getFaturaPeriod(addMonths(closingDate, 1).getFullYear(), addMonths(closingDate, 1).getMonth(), card.closingDay, card.dueDay);
      const paymentsQuery = query(collection(db, 'billPayments'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('cardId', '==', card.id), where('type', '==', 'payment'), where('date', '>=', Timestamp.fromDate(closingDate)), where('date', '<', Timestamp.fromDate(nextFaturaPeriod.closingDate)));

      const combineData = (
        expenses: FaturaTransaction[],
        refunds: FaturaTransaction[],
        payments: FaturaTransaction[]
      ) => {
        const totalExpenses = expenses.reduce((acc, tx) => acc + tx.amount, 0);
        const totalRefunds = refunds.reduce((acc, p) => acc + p.amount, 0);
        const totalPaymentsValue = payments.reduce((acc, p) => acc + p.amount, 0);
        
        const faturaValue = totalExpenses - totalRefunds;
        setTotal(faturaValue);
        
        const allTransactions = [...expenses, ...refunds, ...payments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
        setTransactions(allTransactions);

        const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
        const isCurrentFatura = selectedFatura.month === currentFaturaMonth && selectedFatura.year === currentFaturaYear;
        const isFutureFatura = new Date(selectedFatura.year, selectedFatura.month) > new Date(currentFaturaYear, currentFaturaMonth);
        
        const { status: faturaStatus } = getFaturaStatus(faturaValue, totalPaymentsValue + creditFromPreviousMonth, dueDate, closingDate, isCurrentFatura, isFutureFatura);
        setStatus(faturaStatus);
        
        setLoading(false);
      };

      let localExpenses: FaturaTransaction[] = [];
      let localRefunds: FaturaTransaction[] = [];
      let localPayments: FaturaTransaction[] = [];

      const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
          localExpenses = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'expense' } as FaturaTransaction));
          combineData(localExpenses, localRefunds, localPayments);
      }, (error) => console.error("Error fetching expenses: ", error));
      
      const unsubRefunds = onSnapshot(refundsQuery, (snap) => {
          localRefunds = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'refund' } as FaturaTransaction));
          combineData(localExpenses, localRefunds, localPayments);
      }, (error) => console.error("Error fetching refunds: ", error));

      const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
          localPayments = snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'payment' } as FaturaTransaction));
          combineData(localExpenses, localRefunds, localPayments);
      }, (error) => console.error("Error fetching payments: ", error));
      
      return () => {
        unsubExpenses();
        unsubRefunds();
        unsubPayments();
      };
    };

    const unsubscribePromise = calculateFaturaData();

    return () => {
      unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, [user, activeProfile, card, selectedFatura, getMonthBalance]);

  return { transactions, total, status, fechamento, vencimento, loading };
}
