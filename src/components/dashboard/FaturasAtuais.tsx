
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
import { useProfile } from '@/hooks/use-profile';
import { Card as CardType } from '@/lib/types';
import {
  getCurrentFaturaMonthAndYear,
  getFaturaPeriod,
  getFaturaStatus,
} from '@/lib/fatura-utils';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Landmark } from 'lucide-react';
import { text } from '@/lib/strings';
import { useAddBillTransactionModal } from '@/contexts/AddBillTransactionModalContext';

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
      where('profile', '==', activeProfile)
    );

    const unsubscribe = onSnapshot(cardsQuery, async (cardsSnapshot) => {
      const cards = cardsSnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() } as CardType)
      ).filter(card => !card.isArchived);


      if (cards.length === 0) {
        setFaturas([]);
        setLoading(false);
        return;
      }

      const allFaturasPromises = cards.flatMap((card) => {
        const today = new Date();
        const { month: currentFaturaMonth, year: currentFaturaYear } =
          getCurrentFaturaMonthAndYear(today, card.closingDay);

        const previousFaturaDate = subMonths(
          new Date(currentFaturaYear, currentFaturaMonth),
          1
        );
        const previousFaturaMonth = previousFaturaDate.getMonth();
        const previousFaturaYear = previousFaturaDate.getFullYear();

        const faturasToFetch = [
          {
            month: currentFaturaMonth,
            year: currentFaturaYear,
            isCurrent: true,
          },
          {
            month: previousFaturaMonth,
            year: previousFaturaYear,
            isCurrent: false,
          },
        ];

        return faturasToFetch.map(async (faturaMeta) => {
           const {
            startDate,
            endDate,
            closingDate,
            dueDate,
          } = getFaturaPeriod(
            faturaMeta.year,
            faturaMeta.month,
            card.closingDay,
            card.dueDay
          );

          const expensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('profile', '==', activeProfile),
            where('paymentMethod', '==', `Cartão: ${card.name}`),
            where('date', '>=', Timestamp.fromDate(startDate)),
            where('date', '<=', Timestamp.fromDate(endDate))
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
          
          const prevFaturaPeriod = getFaturaPeriod(
            subMonths(closingDate, 1).getFullYear(),
            subMonths(closingDate, 1).getMonth(),
            card.closingDay,
            card.dueDay
          );

          const paymentsQuery = query(
              collection(db, 'billPayments'),
              where('userId', '==', user.uid),
              where('profile', '==', activeProfile),
              where('cardId', '==', card.id),
              where('type', '==', 'payment'),
              where('date', '>', Timestamp.fromDate(prevFaturaPeriod.closingDate)),
              where('date', '<=', Timestamp.fromDate(closingDate))
          );
          
          const futureExpensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('profile', '==', activeProfile),
            where('paymentMethod', '==', `Cartão: ${card.name}`),
            where('date', '>', Timestamp.fromDate(endDate))
          );

          const [expensesSnap, paymentsSnap, futureExpensesSnap, refundsSnap] =
            await Promise.all([
              getDocs(expensesQuery),
              getDocs(paymentsQuery),
              getDocs(futureExpensesQuery),
              getDocs(refundsQuery)
            ]);

          const totalExpenses = expensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          const totalRefunds = refundsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          const faturaValue = totalExpenses - totalRefunds;

          const pagamentos = paymentsSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          const parcelasFuturas = futureExpensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
          
          const isFutureFatura = new Date(faturaMeta.year, faturaMeta.month) > new Date(currentFaturaYear, currentFaturaMonth);


          const { status, color } = getFaturaStatus(
            faturaValue,
            pagamentos,
            dueDate,
            closingDate,
            faturaMeta.isCurrent,
            isFutureFatura
          );

          const isFaturaFechada = !faturaMeta.isCurrent && status.includes(text.payBillForm.billClosed) && faturaValue - pagamentos > 0;

          const limiteDisponivel = card.limit - faturaValue - parcelasFuturas + pagamentos;

          return {
            id: `${card.id}-${faturaMeta.year}-${faturaMeta.month}`,
            card,
            faturaValue,
            faturaStatus: status,
            isFaturaFechada,
            limiteDisponivel,
            closingDate,
            dueDate,
            pagamentos,
            parcelasFuturas,
            faturaLabel: faturaMeta.isCurrent ? text.payBillForm.currentBill : status,
          };
        });
      });

      const resolvedFaturas = await Promise.all(allFaturasPromises.flat());
      
      const filteredFaturas = resolvedFaturas.filter((f) => {
        // Only show current bill
        if (f.faturaLabel === text.payBillForm.currentBill) return true;
        // Or show closed bills that are not fully paid
        if (!f.isFaturaFechada && f.faturaValue > 0 && f.faturaValue - f.pagamentos > 0) return true;
        
        return false;
      });

      const uniqueFaturas = Array.from(new Map(filteredFaturas.map(f => [f.id, f])).values());
      
      setFaturas(uniqueFaturas);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, activeProfile]);

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
          const barColor = isFaturaFechada ? 'bg-red-500' : 'bg-blue-500';

          return (
            <Card key={id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">{card.name}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openModal('pay')}
                >
                  <Landmark className="mr-2 h-4 w-4" />
                  {text.sidebar.payBill}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">
                      {faturaLabel}
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(faturaValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-sm text-muted-foreground">
                      {text.cards.cardDetails.limit}
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(limiteDisponivel)}
                    </span>
                  </div>
                </div>

                <div className="relative h-4 w-full overflow-hidden rounded-full bg-green-200">
                  <div
                    className="absolute h-full bg-gray-300"
                    style={{
                      width: `${faturaPercent + parcelasFuturasPercent}%`,
                      zIndex: 1,
                    }}
                  />
                  <div
                    className={`absolute h-full ${barColor}`}
                    style={{ width: `${faturaPercent}%`, zIndex: 2 }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {text.payBillForm.closing}:{' '}
                    {format(closingDate, 'dd MMM', { locale: ptBR })}
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
