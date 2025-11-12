
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
  getFaturaStatus
} from '@/lib/fatura-utils';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Landmark } from 'lucide-react';
import { text } from '@/lib/strings';
import { useAddBillTransactionModal } from '@/contexts/AddBillTransactionModalContext';
import { useFatura } from '@/hooks/use-fatura';
import { addMonths, getYear, getMonth } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

interface FaturaInfo {
  id: string;
  card: CardType;
  faturaValue: number;
  limiteDisponivel: number;
  closingDate: Date;
  parcelasFuturas: number;
  faturaLabel: string;
  status: {
      text: string;
      color: string;
  };
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

function FaturaCardSkeleton() {
    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-24" />
            </CardHeader>
            <CardContent className="space-y-4">
                 <div>
                    <div className="flex justify-between items-baseline">
                        <Skeleton className="h-5 w-28" />
                        <Skeleton className="h-7 w-32" />
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                </div>
                <div className="space-y-2">
                    <Skeleton className="h-2 w-full" />
                     <div className="flex justify-between">
                       <Skeleton className="h-3 w-24" />
                       <Skeleton className="h-3 w-24" />
                    </div>
                </div>
                 <div className="flex justify-between pt-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-28" />
                </div>
            </CardContent>
        </Card>
    );
}


function FaturaCard({ card }: { card: CardType }) {
    const { openModal } = useAddBillTransactionModal();
    const today = new Date();
    const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(today, card.closingDay);
    
    const { total, status, fechamento, loading, transactions } = useFatura(card, { month: currentFaturaMonth, year: currentFaturaYear });

    const [futureInstallments, setFutureInstallments] = useState(0);
    const [availableLimit, setAvailableLimit] = useState(0);
    const { user } = useAuth();
    const { activeProfile } = useProfile();

    useEffect(() => {
        if (!user || !activeProfile) return;

        const currentInvoiceValue = transactions
            .filter(t => t.transactionType === 'expense')
            .reduce((acc, t) => acc + t.amount, 0);

        const { closingDate } = getFaturaPeriod(currentFaturaYear, currentFaturaMonth, card.closingDay, card.dueDay);

        const futureExpensesQuery = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('profile', '==', activeProfile),
            where('paymentMethod', '==', `Cartão: ${card.name}`),
            where('date', '>', Timestamp.fromDate(closingDate))
        );

        const unsubscribe = onSnapshot(futureExpensesQuery, (snap) => {
            const futureSum = snap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
            setFutureInstallments(futureSum);
            setAvailableLimit(card.limit - currentInvoiceValue - futureSum);
        });

        return () => unsubscribe();

    }, [card, transactions, user, activeProfile, currentFaturaYear, currentFaturaMonth]);


    if (loading) return <FaturaCardSkeleton />;

    const faturaPercent = (total / card.limit) * 100;
    const parcelasFuturasPercent = (futureInstallments / card.limit) * 100;

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg">{card.name}</CardTitle>
                <Button variant="outline" size="sm" onClick={() => openModal('pay', status.text.includes('Fechada') ? 'payment' : 'anticipate')}>
                    <Landmark className="mr-2 h-4 w-4" />
                    {status.text.includes('Fechada') ? text.sidebar.payBill : 'Antecipar'}
                </Button>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-sm font-medium">{text.payBillForm.currentBill}</span>
                        <span className="text-2xl font-bold">{formatCurrency(total)}</span>
                    </div>
                    <div className="flex justify-between items-baseline mt-1">
                        <span className="text-sm text-muted-foreground">{text.cards.cardDetails.limit} disponível</span>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(availableLimit)}</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                        <div className="absolute h-full bg-yellow-400 transition-all" style={{ width: `${faturaPercent + parcelasFuturasPercent}%` }} />
                        <div className={`absolute h-full ${status.color.replace('text-', 'bg-')}`} style={{ width: `${faturaPercent}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <div className='flex items-center gap-2'>
                            <div className={`h-2 w-2 rounded-full ${status.color.replace('text-', 'bg-')}`}></div>
                            <span>Fatura: {formatCurrency(total)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <div className="h-2 w-2 rounded-full bg-yellow-400"></div>
                            <span>Futuro: {formatCurrency(futureInstallments)}</span>
                        </div>
                    </div>
                </div>

                <div className="flex justify-between text-xs text-muted-foreground pt-2">
                    <span>{text.payBillForm.closing}: {fechamento ? format(fechamento, 'dd/MM') : 'N/A'}</span>
                    <span>{text.cards.cardDetails.limit}: {formatCurrency(card.limit)}</span>
                </div>
            </CardContent>
        </Card>
    );
}


export default function FaturasAtuais() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !activeProfile) {
      setLoading(false);
      setCards([]);
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
      setCards(cardsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cards:", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user, activeProfile]);

  if (loading) {
    return (
      <div className="mt-6">
        <Skeleton className="h-7 w-48 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FaturaCardSkeleton />
          <FaturaCardSkeleton />
          <FaturaCardSkeleton />
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">{text.dashboard.currentInvoices}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <FaturaCard key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}
