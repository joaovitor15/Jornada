
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
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { Card as CardType, Expense, BillPayment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { format, getMonth, getYear } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, TrendingUp, TrendingDown, Loader2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getFaturaPeriod, getFaturaStatus, getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { text } from '@/lib/strings';

interface FaturaDetailsProps {
  card: CardType;
  selectedFatura: { month: number; year: number };
  onFaturaSelect: () => void;
  onEditExpense: (expense: Expense) => void;
  onAnticipateExpense: (expense: Expense) => void;
}

type FaturaTransaction = (Expense | BillPayment) & { transactionType: 'expense' | 'payment' | 'refund' };

export default function FaturaDetails({
  card,
  selectedFatura,
  onFaturaSelect,
  onEditExpense,
  onAnticipateExpense
}: FaturaDetailsProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FaturaTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [fechamento, setFechamento] = useState<Date | null>(null);
  const [vencimento, setVencimento] = useState<Date | null>(null);
  const { toast } = useToast();
  const [expenseToDelete, setExpenseToDelete] = useState<Expense | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


  useEffect(() => {
    if (!user || !activeProfile || !card) return;

    setLoading(true);
    setTransactions([]); // Limpa transações anteriores ao trocar de fatura
    
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
    
    const nextFaturaPeriod = getFaturaPeriod(endDate.getFullYear(), endDate.getMonth() + 1, card.closingDay, card.dueDay);
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

    const unsubscribeExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
      localExpenses = expensesSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: 'expense' } as FaturaTransaction));
      
      const totalExpenses = localExpenses.reduce((acc, tx) => acc + tx.amount, 0);
      const totalPaymentsAndRefunds = localPayments.reduce((acc, tx) => {
        if(tx.type === 'refund') return acc + tx.amount; // Refund adds to payment total
        if(tx.type === 'payment') return acc + tx.amount;
        return acc;
      }, 0);

      const faturaValue = totalExpenses - localPayments.filter(p => p.type === 'refund').reduce((acc, p) => acc + p.amount, 0);

      setTotal(faturaValue < 0 ? 0 : faturaValue);

      const allTransactions = [...localExpenses, ...localPayments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
      setTransactions(allTransactions);

      const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
      const isCurrentFatura = selectedFatura.month === currentFaturaMonth && selectedFatura.year === currentFaturaYear;
      const isFutureFatura = new Date(selectedFatura.year, selectedFatura.month) > new Date(currentFaturaYear, currentFaturaMonth);
      
      const { status: faturaStatus } = getFaturaStatus(faturaValue, totalPaymentsAndRefunds, dueDate, closingDate, isCurrentFatura, isFutureFatura);
      setStatus(faturaStatus);
      
      setLoading(false); 
    }, (error) => {
      console.error("Error fetching expenses: ", error);
      setLoading(false);
    });

    const unsubscribePayments = onSnapshot(paymentsQuery, (paymentsSnapshot) => {
      localPayments = paymentsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, transactionType: doc.data().type } as FaturaTransaction));
      
      const totalExpenses = localExpenses.reduce((acc, tx) => acc + tx.amount, 0);
      const totalPayments = localPayments.filter(p => p.type === 'payment').reduce((acc, p) => acc + p.amount, 0);
      const totalRefunds = localPayments.filter(p => p.type === 'refund').reduce((acc, p) => acc + p.amount, 0);

      const faturaValue = totalExpenses - totalRefunds;
      const totalPaid = totalPayments;

      const allTransactions = [...localExpenses, ...localPayments].sort((a, b) => (b.date as Timestamp).toMillis() - (a.date as Timestamp).toMillis());
      setTransactions(allTransactions);

      const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);
      const isCurrentFatura = selectedFatura.month === currentFaturaMonth && selectedFatura.year === currentFaturaYear;
      const isFutureFatura = new Date(selectedFatura.year, selectedFatura.month) > new Date(currentFaturaYear, currentFaturaMonth);

      const { status: faturaStatus } = getFaturaStatus(faturaValue, totalPaid, dueDate, closingDate, isCurrentFatura, isFutureFatura);
      setStatus(faturaStatus);
    }, (error) => {
      console.error("Error fetching payments: ", error);
    });

    return () => {
      unsubscribeExpenses();
      unsubscribePayments();
    };
  }, [user, activeProfile, card, selectedFatura]);

  const handleDeleteExpense = async () => {
    if (!expenseToDelete) return;
    try {
      await deleteDoc(doc(db, 'expenses', expenseToDelete.id));
      toast({
        title: text.common.success,
        description: text.expensesList.deleteSuccess,
      });
      setIsDeleteDialogOpen(false);
      setExpenseToDelete(null);
    } catch (error) {
       toast({
        variant: 'destructive',
        title: text.common.error,
        description: text.expensesList.deleteError,
      });
    }
  };

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
          <div className="border rounded-lg p-4 text-center">
            <p className={`text-sm font-semibold ${status.includes('Paga') ? 'text-green-500' : 'text-blue-500'}`}>{status}</p>
            <p className="text-3xl font-bold">
              {total.toLocaleString('pt-BR', {
                style: 'currency',
                currency: 'BRL',
              })}
            </p>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
              {fechamento && <span>{text.payBillForm.closing}: {format(fechamento, 'dd/MM/yyyy')}</span>}
              {vencimento && <span>{text.payBillForm.due}: {format(vencimento, 'dd/MM/yyyy')}</span>}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <h3 className="text-md font-semibold mb-2">{text.payBillForm.transactions}</h3>
            {transactions.length === 0 ? (
                <div className="text-center text-muted-foreground py-10">{text.payBillForm.noTransactions}</div>
            ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{text.common.date}</TableHead>
                  <TableHead>{text.common.description}</TableHead>
                  <TableHead className="text-right">{text.common.amount}</TableHead>
                   <TableHead className="text-center">{text.common.actions}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => {
                    const isExpense = tx.transactionType === 'expense';
                    const isPayment = tx.transactionType === 'payment';
                    const isRefund = tx.transactionType === 'refund';

                    let description = '';
                    if(isPayment) description = text.payBillForm.title;
                    else if(isRefund) description = text.payBillForm.refundTitle;
                    else description = tx.description;
                    
                    const expense = tx as Expense;
                    const isInstallment = isExpense && expense.installments && expense.installments > 1;

                    return (
                        <TableRow key={tx.id}>
                            <TableCell className="text-xs text-muted-foreground">{tx.date.toDate().toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</TableCell>
                            <TableCell className="font-medium flex items-center gap-2">
                            {isExpense ? (
                                <TrendingDown className="h-4 w-4 text-red-500" />
                            ) : (
                                <TrendingUp className="h-4 w-4 text-green-500" />
                            )}
                            {description}
                            </TableCell>
                            <TableCell
                            className={`text-right font-semibold ${
                                isExpense ? 'text-foreground' : 'text-green-500'
                            }`}
                            >
                            {isExpense ? '' : '+'}
                            {tx.amount.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                            })}
                            </TableCell>
                             <TableCell className="text-center">
                                {isExpense && (
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0 rounded-full">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      {isInstallment && (
                                        <DropdownMenuItem onClick={() => onAnticipateExpense(expense)}>
                                          {text.anticipateInstallments.title}
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuItem onClick={() => onEditExpense(expense)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        {text.common.rename}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setExpenseToDelete(expense);
                                          setIsDeleteDialogOpen(true);
                                        }}
                                        className="text-red-500"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        {text.common.delete}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                )}
                              </TableCell>
                        </TableRow>
                    );
                })}
              </TableBody>
            </Table>
            )}
          </div>
           <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>{text.expensesList.deleteConfirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                    {text.expensesList.deleteConfirmDescription}
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>{text.common.cancel}</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteExpense}>{text.common.continue}</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </>
      )}
    </div>
  );
}

    