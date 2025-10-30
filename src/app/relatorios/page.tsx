
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import AnnualFinancialChart from '@/components/relatorios/AnnualFinancialChart';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { text } from '@/lib/strings';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import { collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Transaction } from '@/lib/types';
import { getYear } from 'date-fns';

const months = Object.entries(text.dashboard.months).map(([key, label], index) => ({
  value: index,
  label: label,
}));

const currentYear = new Date().getFullYear();

export default function ReportsPage() {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  
  const [availableYears, setAvailableYears] = useState<number[]>([currentYear]);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());

 useEffect(() => {
    if (!user || !activeProfile) {
      return;
    }

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile)
      );

    const incomesQuery = baseQuery('incomes');
    const expensesQuery = baseQuery('expenses');

    const unsubIncomes = onSnapshot(incomesQuery, (incomesSnapshot) => {
        const incomes = incomesSnapshot.docs.map(doc => doc.data() as Transaction);

        const unsubExpenses = onSnapshot(expensesQuery, (expensesSnapshot) => {
            const expenses = expensesSnapshot.docs.map(doc => doc.data() as Transaction);
            const allTransactions = [...incomes, ...expenses];

            if (allTransactions.length > 0) {
                const yearsWithData = new Set(
                allTransactions
                    .map((t) => (t.date ? getYear((t.date as unknown as Timestamp).toDate()) : null))
                    .filter(Boolean) as number[]
                );
                const sortedYears = Array.from(yearsWithData).sort((a, b) => b - a);
                if (sortedYears.length > 0) {
                setAvailableYears(sortedYears);
                if (!yearsWithData.has(selectedYear)) {
                    setSelectedYear(sortedYears[0]);
                }
                }
            } else {
                setAvailableYears([currentYear]);
            }
        });
        return () => unsubExpenses();
    });

    return () => unsubIncomes();

  }, [user, activeProfile, selectedYear]);

  return (
    <div className="p-4 md:p-6 lg:p-8 lg:pt-4 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
            <h1 className="text-2xl font-bold">{text.sidebar.reports}</h1>
            <p className="text-muted-foreground">
                {text.reports.description}
            </p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{text.dashboard.monthLabel}</label>
            <Select
              value={String(selectedMonth)}
              onValueChange={(value) => setSelectedMonth(Number(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={text.dashboard.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month.value} value={String(month.value)}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">{text.dashboard.yearLabel}</label>
            <Select
              value={String(selectedYear)}
              onValueChange={(value) => setSelectedYear(Number(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder={text.dashboard.selectPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>{text.reports.financialSummary(selectedYear)}</CardTitle>
            </CardHeader>
            <CardContent>
              <AnnualFinancialChart year={selectedYear} onMonthSelect={setSelectedMonth} />
            </CardContent>
          </Card>
        </div>
        <div className="lg:col-span-1 space-y-6">
          {/* Futuros cards de relatório específico por perfil serão adicionados aqui */}
        </div>
      </div>
    </div>
  );
}
