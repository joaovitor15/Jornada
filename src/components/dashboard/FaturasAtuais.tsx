
'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { useProfile } from '@/hooks/use-profile';
import { Card as CardType } from '@/lib/types';
import {
  getCurrentFaturaMonthAndYear,
  getFaturaPeriod,
  getFaturaStatus,
} from '@/lib/fatura-utils';
import { format, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Landmark } from 'lucide-react';
import { text } from '@/lib/strings';
import { useAddBillTransactionModal } from '@/contexts/AddBillTransactionModalContext';
import { Progress } from '../ui/progress';

interface FaturaInfo {
  id: string;
  card: CardType;
  faturaValue: number;
  faturaStatus: string;
  isFaturaFechada: boolean;
  limiteDisponivel: number;
  closingDate: Date;
  dueDate: Date;
  pagamentos: number;
  parcelasFuturas: number;
  faturaLabel: string;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export default function FaturasAtuais() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [faturas, setFaturas] = useState<FaturaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const { openModal } = useAddBillTransactionModal();

  const processFaturas = useCallback(async (cardsToProcess: CardType[]) => {
      if (!user || !activeProfile || cardsToProcess.length === 0) {
        return [];
      }

      const allFaturasPromises = cardsToProcess.flatMap((card) => {
        const today = new Date();
        const { month: currentFaturaMonth, year: currentFaturaYear } =
          getCurrentFaturaMonthAndYear(today, card.closingDay);

        const previousFaturaDate = subMonths(new Date(currentFaturaYear, currentFaturaMonth), 1);
        const previousFaturaMonth = previousFaturaDate.getMonth();
        const previousFaturaYear = previousFaturaDate.getFullYear();

        // We are interested in the previous month's bill (if it's closed and unpaid)
        // and the current open bill.
        return [
            { month: previousFaturaMonth, year: previousFaturaYear, isCurrent: false },
            { month: currentFaturaMonth, year: currentFaturaYear, isCurrent: true },
        ].map(async (faturaMeta) => {
          const { startDate, endDate, closingDate, dueDate } = getFaturaPeriod(faturaMeta.year, faturaMeta.month, card.closingDay, card.dueDay);
          
          const expensesQuery = getDocs(query(collection(db, 'expenses'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('paymentMethod', '==', `Cartão: ${card.name}`), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate))));
          const refundsQuery = getDocs(query(collection(db, 'billPayments'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('cardId', '==', card.id), where('type', '==', 'refund'), where('date', '>=', Timestamp.fromDate(startDate)), where('date', '<=', Timestamp.fromDate(endDate))));
          const futureExpensesQuery = getDocs(query(collection(db, 'expenses'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('paymentMethod', '==', `Cartão: ${card.name}`), where('date', '>', Timestamp.fromDate(endDate))));
          
          const prevFaturaPeriod = getFaturaPeriod(subMonths(closingDate, 1).getFullYear(), subMonths(closingDate, 1).getMonth(), card.closingDay, card.dueDay);
          const paymentsQuery = getDocs(query(collection(db, 'billPayments'), where('userId', '==', user.uid), where('profile', '==', activeProfile), where('cardId', '==', card.id), where('type', '==', 'payment'), where('date', '>', Timestamp.fromDate(prevFaturaPeriod.closingDate)), where('date', '<=', Timestamp.fromDate(closingDate))));
          
          const [expensesSnap, paymentsSnap, futureExpensesSnap, refundsSnap] = await Promise.all([expensesQuery, paymentsQuery, futureExpensesSnap, refundsQuery]);

          const totalExpenses = expensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          const totalRefunds = refundsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          const faturaValue = totalExpenses - totalRefunds;
          const pagamentos = paymentsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          const parcelasFuturas = futureExpensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          
          const isFutureFatura = new Date(faturaMeta.year, faturaMeta.month) > new Date(currentFaturaYear, currentFaturaMonth);
          const { status } = getFaturaStatus(faturaValue, pagamentos, dueDate, closingDate, faturaMeta.isCurrent, isFutureFatura);
          const isFaturaFechada = !faturaMeta.isCurrent && status.includes(text.payBillForm.billClosed) && faturaValue > 0 && (faturaValue - pagamentos) > 0.01;

          const limiteDisponivel = card.limit - faturaValue - parcelasFuturas;

          return {
            id: `${card.id}-${faturaMeta.year}-${faturaMeta.month}`, card, faturaValue, faturaStatus: status,
            isFaturaFechada, limiteDisponivel, closingDate, dueDate, pagamentos, parcelasFuturas,
            faturaLabel: faturaMeta.isCurrent ? text.payBillForm.currentBill : status,
          };
        });
      });

      const resolvedFaturas = await Promise.all(allFaturasPromises.flat());
      const filteredFaturas = resolvedFaturas.filter((f) => {
        if (f.faturaLabel === text.payBillForm.currentBill) return true; // Always show current bill
        if (f.isFaturaFechada) return true; // Show closed and unpaid bills
        return false;
      });

      // Ensure uniqueness, sometimes the same bill can be processed twice
      const uniqueFaturas = Array.from(new Map(filteredFaturas.map(f => [f.id, f])).values());
      return uniqueFaturas;
  }, [user, activeProfile]);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setFaturas([]);
      return;
    }
    setLoading(true);
    const cardsQuery = query(
      collection(db, 'cards'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      where('isArchived', '!=', true)
    );
    const unsubscribe = onSnapshot(cardsQuery, (snapshot) => {
      const cardsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardType));
      processFaturas(cardsData).then(faturasData => {
        setFaturas(faturasData);
        setLoading(false);
      });
    }, (error) => {
      console.error("Error fetching cards:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, activeProfile, processFaturas]);

  if (loading) {
    return (
      <div className="mt-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (faturas.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{text.dashboard.currentInvoices}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {faturas.map((faturaInfo) => {
          const {
            id,
            card,
            faturaValue,
            isFaturaFechada,
            limiteDisponivel,
            closingDate,
            parcelasFuturas,
            faturaLabel,
          } = faturaInfo;

          const faturaPercent = (faturaValue / card.limit) * 100;
          const parcelasFuturasPercent = (parcelasFuturas / card.limit) * 100;
          
          let indicatorColor = "bg-blue-500"; // Default for current bill
          if(isFaturaFechada) indicatorColor = "bg-red-500";


          return (
            <Card key={id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{card.name}</CardTitle>
                 <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal('pay', isFaturaFechada ? 'payment' : 'anticipate')}
                >
                  <Landmark className="mr-2 h-4 w-4" />
                  {isFaturaFechada ? text.sidebar.payBill : 'Antecipar'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium">
                      {faturaLabel}
                    </span>
                    <span className="text-2xl font-bold">
                      {formatCurrency(faturaValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-sm text-muted-foreground">
                      {text.cards.cardDetails.limit} disponível
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(limiteDisponivel)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress value={faturaPercent + parcelasFuturasPercent} className="h-2"/>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <div className='flex items-center gap-2'>
                        <div className={`h-2 w-2 rounded-full ${indicatorColor}`}></div>
                        <span>Fatura: {formatCurrency(faturaValue)}</span>
                    </div>
                     <div className='flex items-center gap-2'>
                        <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                        <span>Futuro: {formatCurrency(parcelasFuturas)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground pt-2">
                  <span>
                    {text.payBillForm.closing}:{' '}
                    {format(closingDate, 'dd/MM')}
                  </span>
                  <span>{text.cards.cardDetails.limit}: {formatCurrency(card.limit)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
