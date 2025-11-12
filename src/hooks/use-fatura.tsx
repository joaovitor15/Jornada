
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { subMonths, addMonths, isAfter } from 'date-fns';

type FaturaTransaction = (Expense | BillPayment) & { transactionType: 'expense' | 'payment' | 'refund' | 'anticipation'; description?: string };

export function useFatura(card: CardType, selectedFatura: { month: number; year: number }) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  
  // States for raw data from Firestore
  const [expenseTransactions, setExpenseTransactions] = useState<FaturaTransaction[]>([]);
  const [refundTransactions, setRefundTransactions] = useState<FaturaTransaction[]>([]);
  const [paymentTransactions, setPaymentTransactions] = useState<FaturaTransaction[]>([]);
  const [creditFromPreviousMonth, setCreditFromPreviousMonth] = useState(0);

  const getMonthBalance = useCallback(async (
    localUser: any, 
    localProfile: string, 
    localCard: CardType, 
    month: number, 
    year: number
  ) => {
    const { startDate, endDate } = getFaturaPeriod(year, month, localCard.closingDay, localCard.dueDay);
    
    const expensesQuery = getDocs(query(collection(db, 'expenses'), where('userId', '==', localUser.uid), where('profile', '==', localProfile), where('paymentMethod', '==', `Cartão: ${localCard.name}`), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate))));
    const refundsQuery = getDocs(query(collection(db, 'billPayments'), where('userId', '==', localUser.uid), where('profile', '==', localProfile), where('cardId', '==', localCard.id), where('type', '==', 'refund'), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate))));
    
    const nextFaturaPeriod = getFaturaPeriod(addMonths(endDate, 1).getFullYear(), addMonths(endDate, 1).getMonth(), localCard.closingDay, localCard.dueDay);
    const paymentsQuery = getDocs(query(collection(db, 'billPayments'), where('userId', '==', localUser.uid), where('profile', '==', localProfile), where('cardId', '==', localCard.id), where('type', '==', 'payment'), where('date', '>=', Timestamp.fromDate(endDate)), where('date', '<', Timestamp.fromDate(nextFaturaPeriod.startDate))));
    
    const [expensesSnap, refundsSnap, paymentsSnap] = await Promise.all([expensesQuery, refundsQuery, paymentsQuery]);

    const totalExpenses = expensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
    const totalRefunds = refundsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
    const totalPayments = paymentsSnap.docs.reduce((acc, p) => acc + p.data().amount, 0);
    const faturaValue = totalExpenses - totalRefunds;

    return { faturaValue, totalPayments };
  }, []);

  useEffect(() => {
    if (!user || !activeProfile || !card) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const setupListeners = async () => {
      // 1. Calculate previous month's credit
      const prevFaturaDate = subMonths(new Date(selectedFatura.year, selectedFatura.month), 1);
      const { faturaValue: prevFaturaValue, totalPayments: prevTotalPayments } = await getMonthBalance(user, activeProfile, card, prevFaturaDate.getMonth(), prevFaturaDate.getFullYear());
      setCreditFromPreviousMonth(Math.max(0, prevTotalPayments - prevFaturaValue));

      // 2. Get current month's data and set up listeners
      const { startDate, endDate } = getFaturaPeriod(selectedFatura.year, selectedFatura.month, card.closingDay, card.dueDay);
      
      const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('paymentMethod', '==', `Cartão: ${card.name}`), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate)), orderBy('date', 'desc'));
      const refundsQuery = query(collection(db, 'billPayments'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('cardId', '==', card.id), where('type', '==', 'refund'), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate)));
      const nextFaturaPeriod = getFaturaPeriod(addMonths(endDate, 1).getFullYear(), addMonths(endDate, 1).getMonth(), card.closingDay, card.dueDay);
      const paymentsQuery = query(collection(db, 'billPayments'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('cardId', '==', card.id), where('type', '==', 'payment'), where('date', '>=', Timestamp.fromDate(endDate)), where('date', '<', Timestamp.fromDate(nextFaturaPeriod.startDate)));

      const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
          setExpenseTransactions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'expense' } as FaturaTransaction)));
      }, (error) => console.error("Error fetching expenses: ", error));
      
      const unsubRefunds = onSnapshot(refundsQuery, (snap) => {
          setRefundTransactions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'refund' } as FaturaTransaction)));
      }, (error) => console.error("Error fetching refunds: ", error));

      const unsubPayments = onSnapshot(paymentsQuery, (snap) => {
          setPaymentTransactions(snap.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: doc.data().description === 'Antecipação de Fatura' ? 'anticipation' : 'payment' } as FaturaTransaction)));
      }, (error) => console.error("Error fetching payments: ", error));

      // After setting up listeners, mark as loaded
      setLoading(false);

      return () => {
        unsubExpenses();
        unsubRefunds();
        unsubPayments();
      };
    };

    const unsubscribePromise = setupListeners();

    return () => {
      unsubscribePromise.then(unsub => unsub && unsub());
    };
  }, [user, activeProfile, card.id, card.closingDay, card.dueDay, selectedFatura.month, selectedFatura.year, getMonthBalance]);


  const processedData = useMemo(() => {
    const totalExpenses = expenseTransactions.reduce((acc, tx) => acc + tx.amount, 0);
    const totalRefunds = refundTransactions.reduce((acc, p) => acc + p.amount, 0);
    const totalPaymentsOnThisCycle = paymentTransactions.reduce((acc, p) => acc + p.amount, 0);
    
    const faturaBruta = totalExpenses - totalRefunds;
    const totalPagoConsiderandoCredito = totalPaymentsOnThisCycle + creditFromPreviousMonth;
    const faturaLiquida = faturaBruta - totalPagoConsiderandoCredito;

    const allTransactions = [...expenseTransactions, ...refundTransactions, ...paymentTransactions].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());

    const { closingDate, dueDate } = getFaturaPeriod(selectedFatura.year, selectedFatura.month, card.closingDay, card.dueDay);
    const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
    const isCurrentFatura = selectedFatura.month === currentFaturaMonth && selectedFatura.year === currentFaturaYear;
    const faturaDateObj = new Date(selectedFatura.year, selectedFatura.month);
    const currentFaturaDateObj = new Date(currentFaturaYear, currentFaturaMonth);
    const isFutureFatura = isAfter(faturaDateObj, currentFaturaDateObj);
    
    const { status: faturaStatus, color: faturaColor } = getFaturaStatus(faturaBruta, totalPagoConsiderandoCredito, dueDate, closingDate, isCurrentFatura, isFutureFatura);

    return {
      transactions: allTransactions,
      total: faturaLiquida,
      status: { text: faturaStatus, color: faturaColor },
      fechamento: closingDate,
      vencimento: dueDate,
    };

  }, [expenseTransactions, refundTransactions, paymentTransactions, creditFromPreviousMonth, card, selectedFatura]);

  return { ...processedData, loading };
}
