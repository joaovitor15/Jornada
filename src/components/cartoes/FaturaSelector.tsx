'use client';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card as CardType } from '@/lib/types';
import { ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  subMonths,
  getMonth,
  getYear,
  addMonths,
  startOfMonth,
  isBefore,
  isAfter,
} from 'date-fns';
import { getFaturaPeriod, getFaturaStatus, getCurrentFaturaMonthAndYear } from '@/lib/fatura-utils';

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

interface Fatura {
    month: number;
    year: number;
    status: string;
    value: number;
}

interface FaturaSelectorProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  card: CardType;
  onFaturaSelect: (fatura: { month: number, year: number }) => void;
  currentFatura: { month: number, year: number };
}

export default function FaturaSelector({ isOpen, onOpenChange, card, onFaturaSelect, currentFatura }: FaturaSelectorProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [faturas, setFaturas] = useState<Fatura[]>([]);
  
  useEffect(() => {
    const fetchFaturas = async () => {
      if (!isOpen || !user || !activeProfile || !card) return;

      setLoading(true);

      try {
        const expensesBaseQuery = query(
          collection(db, 'expenses'),
          where('userId', '==', user.uid),
          where('profile', '==', activeProfile),
          where('paymentMethod', '==', `Cartão: ${card.name}`)
        );

        const firstExpenseQuery = query(expensesBaseQuery, orderBy('date', 'asc'), limit(1));
        const lastExpenseQuery = query(expensesBaseQuery, orderBy('date', 'desc'), limit(1));
        
        const [firstExpenseSnap, lastExpenseSnap] = await Promise.all([
            getDocs(firstExpenseQuery),
            getDocs(lastExpenseQuery),
        ]);

        const { month: currentFaturaMonth, year: currentFaturaYear } = getCurrentFaturaMonthAndYear(new Date(), card.closingDay);

        let startDate = startOfMonth(new Date(currentFaturaYear, currentFaturaMonth));
        if (!firstExpenseSnap.empty) {
            startDate = (firstExpenseSnap.docs[0].data().date as Timestamp).toDate();
        }

        let endDate = addMonths(new Date(currentFaturaYear, currentFaturaMonth), 1);
        if (!lastExpenseSnap.empty) {
            const lastDate = (lastExpenseSnap.docs[0].data().date as Timestamp).toDate();
            if (isAfter(lastDate, endDate)) {
                endDate = lastDate;
            }
        }
        
        const monthsToFetch: { month: number, year: number }[] = [];
        let loopDate = startOfMonth(startDate);
        
        while (isBefore(loopDate, addMonths(endDate, 1))) {
            monthsToFetch.push({ month: getMonth(loopDate), year: getYear(loopDate) });
            loopDate = addMonths(loopDate, 1);
        }
        
        const uniqueMonths = monthsToFetch.filter(
          (f, i, self) => i === self.findIndex(t => t.month === f.month && t.year === f.year)
        );
        
        const faturasDataPromises = uniqueMonths.map(async ({ month, year }) => {
            const { startDate, endDate, dueDate, closingDate } = getFaturaPeriod(year, month, card.closingDay, card.dueDay);
            
            const expensesQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', user.uid),
                where('profile', '==', activeProfile),
                where('paymentMethod', '==', `Cartão: ${card.name}`),
                where('date', '>=', Timestamp.fromDate(startDate)),
                where('date', '<=', Timestamp.fromDate(endDate))
            );
            
            const nextFaturaPeriod = getFaturaPeriod(addMonths(closingDate, 1).getFullYear(), addMonths(closingDate, 1).getMonth(), card.closingDay, card.dueDay);
            const paymentsQuery = query(
                collection(db, 'billPayments'),
                where('userId', '==', user.uid),
                where('profile', '==', activeProfile),
                where('cardId', '==', card.id),
                where('date', '>=', Timestamp.fromDate(closingDate)),
                where('date', '<', Timestamp.fromDate(nextFaturaPeriod.closingDate))
            );

            const [expensesSnap, paymentsSnap] = await Promise.all([getDocs(expensesQuery), getDocs(paymentsQuery)]);

            const totalExpenses = expensesSnap.docs.reduce((acc, doc) => acc + doc.data().amount, 0);
            const totalPayments = paymentsSnap.docs.reduce((acc, p) => acc + p.data().amount, 0);
            const { status } = getFaturaStatus(totalExpenses, totalPayments, dueDate);

            return { month, year, status, value: totalExpenses };
        });

        let resolvedFaturas = (await Promise.all(faturasDataPromises)) as Fatura[];
        const currentMonthStart = startOfMonth(new Date(currentFaturaYear, currentFaturaMonth));
        
        resolvedFaturas = resolvedFaturas.filter(f => {
            const faturaDate = startOfMonth(new Date(f.year, f.month));
            // Show if it has value OR if it's the current month or a future month
            return f.value > 0 || !isBefore(faturaDate, currentMonthStart);
        });

        resolvedFaturas.sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });

        setFaturas(resolvedFaturas);
        
      } catch (error) {
        console.error("Error fetching faturas: ", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFaturas();
  }, [isOpen, user, activeProfile, card]);


  const handleSelect = (fatura: { month: number, year: number }) => {
    onFaturaSelect(fatura);
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Selecione uma fatura</DialogTitle>
          <DialogDescription>
            Escolha um mês para visualizar os detalhes da fatura do cartão {card.name}.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col space-y-2 py-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
             <div className="flex justify-center items-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : faturas.length > 0 ? (
            faturas.map((fatura, index) => (
               <button
                key={`${fatura.year}-${fatura.month}`}
                onClick={() => handleSelect(fatura)}
                className={cn(
                  "w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between",
                  currentFatura.month === fatura.month && currentFatura.year === fatura.year 
                    ? "bg-primary/10" 
                    : "hover:bg-muted"
                )}
              >
                <div>
                  <p className="font-semibold">{months[fatura.month]} de {fatura.year}</p>
                  <p className={`text-sm ${fatura.status.includes('Paga') ? 'text-green-500' : (fatura.status.includes('Vencida') ? 'text-red-500' : 'text-blue-500')}`}>
                    {fatura.status}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-lg">
                    {fatura.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
                    <ChevronRight className="h-5 w-5 text-secondary-foreground" />
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-10">Nenhuma fatura encontrada para este cartão.</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
