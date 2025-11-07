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

    // Consulta de Despesas (Correta, sem alteração)
    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      where('paymentMethod', '==', `Cartão: ${card.name}`),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate)),
      orderBy('date', 'desc')
    );
    
    // --- INÍCIO DA CORREÇÃO ---

    // Consulta 1: Busca ESTORNOS (refunds) DENTRO do período da fatura
    const refundsQuery = query(
        collection(db, 'billPayments'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('cardId', '==', card.id),
        where('type', '==', 'refund'), // Apenas Estornos
        where('date', '>=', Timestamp.fromDate(startDate)), // Dentro do período
        where('date', '<=', Timestamp.fromDate(endDate))   // Dentro do período
    );

    // Consulta 2: Busca PAGAMENTOS (payments) APÓS o fechamento
    const paymentStart = closingDate;
    const paymentEnd = addMonths(closingDate, 1);

    const paymentsQuery = query(
        collection(db, 'billPayments'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('cardId', '==', card.id),
        where('type', '==', 'payment'), // Apenas Pagamentos
        where('date', '>=', Timestamp.fromDate(paymentStart)), // Após o fechamento
        where('date', '<', Timestamp.fromDate(paymentEnd))
    );

    // --- FIM DA CORREÇÃO ---


    let localExpenses: FaturaTransaction[] = [];
    let localRefunds: FaturaTransaction[] = []; // Nova variável para estornos
    let localPayments: FaturaTransaction[] = [];

    const handleDataUpdate = () => {
        const totalExpenses = localExpenses.reduce((acc, tx) => acc + tx.amount, 0);
        
        // Pagamentos vêm da consulta de pagamentos
        const totalPaymentsValue = localPayments
            .filter(p => p.type === 'payment')
            .reduce((acc, p) => acc + p.amount, 0);

        // Estornos vêm da consulta de estornos
        const totalRefunds = localRefunds
            .filter(p => p.type === 'refund')
            .reduce((acc, p) => acc + p.amount, 0);

        // O valor total da fatura é o gasto MENOS os estornos.
        const faturaValue = totalExpenses - totalRefunds;

        setTotal(faturaValue < 0 ? 0 : faturaValue);

        // Combina as 3 listas para exibição
        const allTransactions = [...localExpenses, ...localRefunds, ...localPayments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
        setTransactions(allTransactions);

        const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
        const isCurrentFatura = selectedFatura.month === currentFaturaMonth && selectedFatura.year === currentFaturaYear;
        const isFutureFatura = new Date(selectedFatura.year, selectedFatura.month) > new Date(currentFaturaYear, currentFaturaMonth);
      
        // O status é calculado com base no valor da fatura (despesas - estornos) e nos pagamentos feitos.
        const { status: faturaStatus } = getFaturaStatus(faturaValue, totalPaymentsValue, dueDate, closingDate, isCurrentFatura, isFutureFatura);
        setStatus(faturaStatus);

        setLoading(false);
    }
    
    // Listener para Despesas
    const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
      localExpenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'expense' } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      setLoading(false);
    });

    // --- NOVOS LISTENERS ---
    
    // Listener para Estornos
    const unsubscribeRefunds = onSnapshot(refundsQuery, (refundsSnapshot) => {
      localRefunds = refundsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'refund' } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching refunds: ", error);
    });

    // Listener para Pagamentos
    const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
      localPayments = paymentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'payment' } as FaturaTransaction));
      handleDataUpdate();
    }, (error) => {
      console.error("Error fetching payments: ", error);
    });

    // --- FIM DA ALTERAÇÃO ---

    return () => {
      unsubscribeExpenses();
      unsubscribeRefunds(); // Adicionado
      unsubscribePayments();
    };
  }, [user, activeProfile, card, selectedFatura]);

  return { transactions, total, status, fechamento, vencimento, loading };
}