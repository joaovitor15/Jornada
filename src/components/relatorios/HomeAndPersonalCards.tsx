
'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowUpCircle, TrendingDown, Wallet } from 'lucide-react';
import { text } from '@/lib/strings';
import { useTransactions } from '@/hooks/use-transactions';
import { useProfile } from '@/hooks/use-profile';
import { getMonth, getYear } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { Transaction, BillPayment, Expense } from '@/lib/types';


interface HomeAndPersonalCardsProps {
    selectedMonth: number;
    selectedYear: number;
}

const months = Object.entries(text.dashboard.months).map(
  ([key, label], index) => ({
    value: index,
    label: label,
  })
);

export default function HomeAndPersonalCards({ selectedMonth, selectedYear }: HomeAndPersonalCardsProps) {
    const { activeProfile } = useProfile();
    const { incomes, expenses, billPayments, loading } = useTransactions(activeProfile);

    const { totalIncome, totalExpenses, finalBalance } = useMemo(() => {
        const filterByMonthAndYear = (t: Omit<Transaction | BillPayment, 'id'>) => {
            if (!t.date) return false;
            const date = (t.date as unknown as Timestamp).toDate();
            return getYear(date) === selectedYear && getMonth(date) === selectedMonth;
        };

        const monthlyIncomes = incomes
            .filter(filterByMonthAndYear)
            .reduce((acc, curr) => acc + curr.amount, 0);

        const monthlyNonCardExpenses = expenses
            .filter(filterByMonthAndYear)
            .filter((e) => !(e.paymentMethod?.startsWith('Cartão:')))
            .reduce((acc, curr) => acc + curr.amount, 0);
        
        const monthlyBillPayments = billPayments
            .filter(filterByMonthAndYear)
            .reduce((acc, curr) => acc + curr.amount, 0);

        const totalMonthlyExpenses = monthlyNonCardExpenses + monthlyBillPayments;
        const totalFinalBalance = monthlyIncomes - totalMonthlyExpenses;

        return {
            totalIncome: monthlyIncomes,
            totalExpenses: totalMonthlyExpenses,
            finalBalance: totalFinalBalance,
        };

    }, [incomes, expenses, billPayments, selectedMonth, selectedYear]);

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
        });
    };

    if (loading) {
        return <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mt-10" />;
    }

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {text.reports.totalIncome}
                         <span className="text-xs font-normal text-muted-foreground">
                            ({months.find((m) => m.value === selectedMonth)?.label} de {selectedYear})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
                        <ArrowUpCircle className="h-6 w-6 text-green-500" />
                    </div>
                    <span className="text-2xl font-bold">{formatCurrency(totalIncome)}</span>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        {text.reports.outgoings}
                         <span className="text-xs font-normal text-muted-foreground">
                            ({months.find((m) => m.value === selectedMonth)?.label} de {selectedYear})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                        <TrendingDown className="h-6 w-6 text-red-500" />
                    </div>
                    <span className="text-2xl font-bold">{formatCurrency(totalExpenses)}</span>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                       {text.reports.finalBalance}
                         <span className="text-xs font-normal text-muted-foreground">
                            ({months.find((m) => m.value === selectedMonth)?.label} de {selectedYear})
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
                     <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/50">
                        <Wallet className="h-6 w-6 text-blue-500" />
                    </div>
                    <span className="text-2xl font-bold">{formatCurrency(finalBalance)}</span>
                </CardContent>
            </Card>
        </>
    );
}
