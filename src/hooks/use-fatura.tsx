
'use client';

import { useState, useEffect } from 'react';
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
} from 'firebase/firestore';
import { Card as CardType, Expense, BillPayment } from '@/lib/types';
import { getFaturaPeriod, getFaturaStatus, getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';
import { addMonths } from 'date-fns';

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

  useEffect(() => {
    if (!user || !activeProfile || !card) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setTransactions([]);

    const { startDate, endDate, closingDate, dueDate } = getFaturaPeriod(
      selectedFatura.year,
      selectedFatura.month,
      card.closingDay,
      card.dueDay
    );

    setFechamento(closingDate);
    setVencimento(dueDate);

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      where('paymentMethod', '==', `Cartão: ${card.name}`),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const nextFaturaPeriod = getFaturaPeriod(
      addMonths(closingDate, 1).getFullYear(), 
      addMonths(closingDate, 1).getMonth(), 
      card.closingDay, 
      card.dueDay
    );

    const paymentsQuery = query(
        collection(db, 'billPayments'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('cardId', '==', card.id),
        where('date', '>=', Timestamp.fromDate(closingDate)),
        where('date', '<', Timestamp.fromDate(nextFaturaPeriod.closingDate))
    );

    let localExpenses: FaturaTransaction[] = [];
    let localPayments: FaturaTransaction[] = [];

    const handleDataUpdate = () => {
        const totalExpenses = localExpenses.reduce((acc, tx) => acc + tx.amount, 0);
        const totalPaymentsValue = localPayments
            .filter(p => p.type === 'payment')
            .reduce((acc, p) => acc + p.amount, 0);
        const totalRefunds = localPayments
            .filter(p => p.type === 'refund')
            .reduce((acc, p) => acc + p.amount, 0);

        const faturaValue = totalExpenses - totalRefunds;

        setTotal(faturaValue < 0 ? 0 : faturaValue);

        const allTransactions = [...localExpenses, ...localPayments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
        setTransactions(allTransactions);

        const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
        const isCurrentFatura = selectedFatura.month === currentFaturaMonth && selectedFatura.year === currentFaturaYear;
        const isFutureFatura = new Date(selectedFatura.year, selectedFatura.month) > new Date(currentFaturaYear, currentFaturaMonth);
      
        const { status: faturaStatus } = getFaturaStatus(faturaValue, totalPaymentsValue, dueDate, closingDate, isCurrentFatura, isFutureFatura);
        setStatus(faturaStatus);

        setLoading(false);
    }
    
    const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
      localExpenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'expense' } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      setLoading(false);
    });

    const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
      localPayments = paymentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: doc.data().type } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching payments: ", error);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribePayments();
    };
  }, [user, activeProfile, card, selectedFatura]);

  return { transactions, total, status, fechamento, vencimento, loading };
}
