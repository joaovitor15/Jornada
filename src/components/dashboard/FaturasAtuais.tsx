'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
  orderBy,
  getDocs,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { Card as CardType, Expense } from '@/lib/types';
import {
  getCurrentFaturaMonthAndYear,
  getFaturaPeriod,
  getFaturaStatus,
} from '@/lib/fatura-utils';
import { format, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { text } from '@/lib/strings';

interface FaturaInfo {
  card: CardType;
  faturaValue: number;
  faturaStatus: string;
  isFaturaFechada: boolean;
  limiteDisponivel: number;
  closingDate: Date;
  pagamentos: number;
  parcelasFuturas: number;
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
      );

      if (cards.length === 0) {
        setFaturas([]);
        setLoading(false);
        return;
      }

      const faturasPromises = cards.map(async (card) => {
        const today = new Date();
        const { month: currentFaturaMonth, year: currentFaturaYear } =
          getCurrentFaturaMonthAndYear(today, card.closingDay);

        const {
          startDate: currentFaturaStart,
          endDate: currentFaturaEnd,
          closingDate,
          dueDate,
        } = getFaturaPeriod(
          currentFaturaYear,
          currentFaturaMonth,
          card.closingDay,
          card.dueDay
        );
        
        const nextFaturaPeriod = getFaturaPeriod(addMonths(closingDate, 1).getFullYear(), addMonths(closingDate, 1).getMonth(), card.closingDay, card.dueDay);

        const expensesQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('paymentMethod', '==', `Cartão: ${card.name}`),
          where('date', '>=', Timestamp.fromDate(currentFaturaStart)),
          where('date', '<=', Timestamp.fromDate(currentFaturaEnd))
        );

        const futureExpensesQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('paymentMethod', '==', `Cartão: ${card.name}`),
          where('date', '>', Timestamp.fromDate(currentFaturaEnd))
        );

        const paymentsQuery = query(
          collection(db, 'billPayments'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('cardId', '==', card.id),
          where('date', '>=', Timestamp.fromDate(closingDate)),
          where('date', '<', Timestamp.fromDate(nextFaturaPeriod.closingDate))
        );

        const [expensesSnap, paymentsSnap, futureExpensesSnap] =
          await Promise.all([
            getDocs(expensesQuery),
            getDocs(paymentsQuery),
            getDocs(futureExpensesQuery),
          ]);

        const faturaValue = expensesSnap.docs.reduce(
          (acc, doc) => acc + doc.data().amount,
          0
        );
        const pagamentos = paymentsSnap.docs.reduce(
          (acc, doc) => acc + doc.data().amount,
          0
        );

        const parcelasFuturas = futureExpensesSnap.docs.reduce(
            (acc, doc) => acc + doc.data().amount,
            0
        );
        
        const isCurrentFatura = true;
        const isFutureFatura = false;
        
        const { status, color } = getFaturaStatus(
          faturaValue,
          pagamentos,
          dueDate,
          closingDate,
          isCurrentFatura,
          isFutureFatura
        );
        
        const isFaturaFechada = status.includes(text.payBillForm.billClosed) && faturaValue > pagamentos;

        const limiteDisponivel = card.limit - faturaValue - parcelasFuturas + pagamentos;

        return {
          card,
          faturaValue,
          faturaStatus: status,
          isFaturaFechada,
          limiteDisponivel,
          closingDate,
          pagamentos,
          parcelasFuturas,
        };
      });

      const resolvedFaturas = await Promise.all(faturasPromises);
      setFaturas(resolvedFaturas);
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
      <h2 className="text-xl font-semibold mb-4">Faturas Atuais</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {faturas.map((faturaInfo) => {
          const {
            card,
            faturaValue,
            isFaturaFechada,
            limiteDisponivel,
            closingDate,
            parcelasFuturas,
          } = faturaInfo;

          const faturaPercent = (faturaValue / card.limit) * 100;
          const parcelasFuturasPercent = (parcelasFuturas / card.limit) * 100;
          const barColor = isFaturaFechada ? 'bg-red-500' : 'bg-blue-500';

          return (
            <Card key={card.id}>
              <CardHeader>
                <CardTitle className="text-lg">{card.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm text-muted-foreground">
                      Fatura Atual
                    </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(faturaValue)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline mt-1">
                    <span className="text-sm text-muted-foreground">
                      Limite Disponível
                    </span>
                    <span className="text-sm font-semibold text-green-600">
                      {formatCurrency(limiteDisponivel)}
                    </span>
                  </div>
                </div>

                <div className="relative h-4 w-full overflow-hidden rounded-full bg-green-200">
                  {/* Barra de parcelas futuras (cinza) */}
                   <div
                    className="absolute h-full bg-gray-300"
                    style={{
                      width: `${faturaPercent + parcelasFuturasPercent}%`,
                      zIndex: 1,
                    }}
                  />
                  {/* Barra da fatura atual (azul/vermelha) */}
                  <div
                    className={`absolute h-full ${barColor}`}
                    style={{ width: `${faturaPercent}%`, zIndex: 2 }}
                  />
                </div>

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    Fechamento: {format(closingDate, 'dd MMM', { locale: ptBR })}
                  </span>
                  <span>Limite: {formatCurrency(card.limit)}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}