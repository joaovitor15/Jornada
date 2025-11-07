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
import { addMonths, subMonths } from 'date-fns';

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
    
    // Período da fatura anterior para buscar pagamentos
    const prevFaturaDate = subMonths(new Date(selectedFatura.year, selectedFatura.month), 1);
    const prevFaturaPeriod = getFaturaPeriod(
        prevFaturaDate.getFullYear(),
        prevFaturaDate.getMonth(),
        card.closingDay,
        card.dueDay
    );


    setFechamento(closingDate);
    setVencimento(dueDate);

    // Despesas e Estornos ocorrem DENTRO do período da fatura (startDate a endDate)
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      where('paymentMethod', '==', `Cartão: ${card.name}`),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    const refundsQuery = query(
        collection(db, 'billPayments'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('cardId', '==', card.id),
        where('type', '==', 'refund'),
        where('date', '>=', Timestamp.fromDate(startDate)),
        where('date', '<=', Timestamp.fromDate(endDate))
    );

    // Pagamentos (normais e antecipados) ocorrem ENTRE o fechamento da fatura ANTERIOR e o fechamento da ATUAL.
    const paymentsQuery = query(
        collection(db, 'billPayments'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('cardId', '==', card.id),
        where('type', '==', 'payment'),
        where('date', '>', Timestamp.fromDate(prevFaturaPeriod.closingDate)), 
        where('date', '<=', Timestamp.fromDate(closingDate))
    );


    let localExpenses: FaturaTransaction[] = [];
    let localRefunds: FaturaTransaction[] = [];
    let localPayments: FaturaTransaction[] = [];

    const handleDataUpdate = () => {
        const totalExpenses = localExpenses.reduce((acc, tx) => acc + tx.amount, 0);
        const totalRefunds = localRefunds.reduce((acc, p) => acc + p.amount, 0);
        const totalPaymentsValue = localPayments.reduce((acc, p) => acc + p.amount, 0);

        const faturaValue = totalExpenses - totalRefunds;

        setTotal(faturaValue < 0 ? 0 : faturaValue);

        const allTransactions = [...localExpenses, ...localRefunds, ...localPayments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
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
    
    const unsubscribeRefunds = onSnapshot(refundsQuery, (refundsSnapshot) => {
      localRefunds = refundsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'refund' } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching refunds: ", error);
    });

    const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
      localPayments = paymentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'payment' } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching payments: ", error);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribeRefunds();
      unsubscribePayments();
    };
  }, [user, activeProfile, card, selectedFatura]);

  return { transactions, total, status, fechamento, vencimento, loading };
}
