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
import { Card as CardType, Expense, BillPayment, Transaction } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, TrendingUp, TrendingDown, Loader2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFaturaPeriod, getFaturaStatus } from '@/lib/fatura-utils';

interface FaturaDetailsProps {
  card: CardType;
  selectedFatura: { month: number; year: number };
  onFaturaSelect: () => void;
}

export default function FaturaDetails({
  card,
  selectedFatura,
  onFaturaSelect,
}: FaturaDetailsProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [fechamento, setFechamento] = useState<Date | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);

  useEffect(() => {
    if (!user || !activeProfile || !card) return;

    setLoading(true);
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
    
    const paymentsQuery = query(
        collection(db, 'billPayments'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile),
        where('cardId', '==', card.id),
        where('date', '>=', Timestamp.fromDate(startDate)),
        // Payments can happen after the closing date, so we check until the due date of next month for safety
        where('date', '<=', Timestamp.fromDate(new Date(dueDate.getFullYear(), dueDate.getMonth() + 1, 0)))
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
      const expenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'expense' } as Expense & {type: 'expense'}));
      
      const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
        const payments = paymentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'payment' } as BillPayment & {type: 'payment'}));
        
        const allTransactions = [...expenses, ...payments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
        
        setTransactions(allTransactions as unknown as Transaction[]);

        const totalExpenses = expenses.reduce((acc, tx) => acc + tx.amount, 0);
        const totalPayments = payments
            .filter(p => {
                const pDate = p.date.toDate();
                // Consider payments made between closing date and next closing date
                return pDate >= closingDate && pDate < getFaturaPeriod(closingDate.getFullYear(), closingDate.getMonth() +1, card.closingDay, card.dueDay).closingDate
            })
            .reduce((acc, tx) => acc + tx.amount, 0);

        setTotal(totalExpenses);
        
        const { status: faturaStatus } = getFaturaStatus(totalExpenses, totalPayments, dueDate);
        setStatus(faturaStatus);

        setLoading(false);
      });
      
      return () => unsubscribePayments();
    });


    return () => unsubscribeExpenses();
  }, [user, activeProfile, card, selectedFatura]);

  const faturaDate = new Date(selectedFatura.year, selectedFatura.month);
  const formattedFatura =
    format(faturaDate, 'MMMM', { locale: ptBR }) +
    ` de ${selectedFatura.year}`;

  return (
    <div className="flex flex-col h-full border rounded-lg p-4 space-y-4">
      <Button variant="outline" className="w-full" onClick={onFaturaSelect}>
        <CalendarIcon className="mr-2 h-4 w-4" />
        <span>{formattedFatura}</span>
      </Button>

      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary"/></div>
      ) : (
        <>
          {/* Resumo da Fatura */}
          <div className="border rounded-lg p-4 text-center">
            <p className={`text-sm font-semibold ${status.includes('Paga') ? 'text-green-500' : 'text-blue-500'}`}>{status}</p>
            <p className="text-3xl font-bold">
              {total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
              {fechamento && <span>Fechamento: {format(fechamento, 'dd/MM/yyyy')}</span>}
              {vencimento && <span>Vencimento: {format(vencimento, 'dd/MM/yyyy')}</span>}
            </div>
          </div>

          {/* Lista de Movimentações */}
          <div className="flex-1 overflow-auto">
            <h3 className="text-md font-semibold mb-2">Movimentações da Fatura</h3>
            {transactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">Nenhuma movimentação nesta fatura.</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                    const isPayment = 'cardId' in tx;
                    return (
                        <TableRow key={tx.id}>
                            <TableCell className="text-xs text-muted-foreground">{tx.date.toDate().toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                            <TableCell className="font-medium flex items-center gap-2">
                            {isPayment ? (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            ) : (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            )}
                            {isPayment ? 'Pagamento da Fatura' : tx.description}
                            </TableCell>
                            <TableCell
                            className={`text-right font-semibold ${
                                isPayment ? 'text-green-500' : 'text-foreground'
                            }`}
                            >
                            {tx.amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            })}
                            </TableCell>
                        </TableRow>
                    );
                })}
              </TableBody>
            </Table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
