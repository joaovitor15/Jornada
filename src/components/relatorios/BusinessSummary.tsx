'use client';

import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, TrendingDown, Percent, Loader2 } from 'lucide-react';
import { businessIncomeCategories, businessExpenseCategories } from '@/lib/categories/business';

interface BusinessSummaryProps {
  year: number;
}

interface SummaryData {
  grossProfit: number;
  grossMargin: number;
  netRevenue: number;
  netProfit: number;
  netMargin: number;
  totalExpenses: number;
}

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatPercent = (value: number) => {
  return `${value.toFixed(2)}%`;
};

const FinancialSummaryCard = ({ title, value, subtitle, subvalue, icon: Icon }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}: {subvalue}</p>}
    </CardContent>
  </Card>
);

const GrossProfitCard = ({ value, margin }: { value: string, margin: string }) => (
    <Card>
        <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-center">Lucro Bruto</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center">
            <div className="text-2xl font-bold mb-1">{value}</div>
            <p className="text-xs text-muted-foreground text-center">
                Margem Bruta: <span className="font-semibold">{margin}</span>
            </p>
        </CardContent>
    </Card>
);


export default function BusinessSummary({ year }: BusinessSummaryProps) {
  const { user } = useAuth();
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const startDate = Timestamp.fromDate(new Date(year, 0, 1));
    const endDate = Timestamp.fromDate(new Date(year, 11, 31, 23, 59, 59));

    const baseQuery = (collectionName: string) =>
      query(
        collection(db, collectionName),
        where('userId', '==', user.uid),
        where('profile', '==', 'Business'),
        where('date', '>=', startDate),
        where('date', '<=', endDate)
      );

    const incomesUnsub = onSnapshot(baseQuery('incomes'), (incomesSnap) => {
      const expensesUnsub = onSnapshot(baseQuery('expenses'), (expensesSnap) => {
        let totalRevenue = 0;
        incomesSnap.forEach(doc => {
          const income = doc.data();
          if (businessIncomeCategories['Vendas (Receitas)'].includes(income.subcategory)) {
            totalRevenue += income.amount;
          }
        });

        let supplierCosts = 0;
        let otherExpenses = 0;
        expensesSnap.forEach(doc => {
          const expense = doc.data();
          if (businessExpenseCategories['Fornecedores'].includes(expense.subcategory)) {
            supplierCosts += expense.amount;
          } else {
            otherExpenses += expense.amount;
          }
        });

        const grossProfit = totalRevenue - supplierCosts;
        const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
        const netProfit = grossProfit - otherExpenses;
        const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

        setSummaryData({
          grossProfit,
          grossMargin,
          netRevenue: totalRevenue,
          netProfit,
          netMargin,
          totalExpenses: supplierCosts + otherExpenses,
        });
        setLoading(false);
      });
      return () => expensesUnsub();
    });

    return () => incomesUnsub();
  }, [user, year]);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
                <CardHeader><Loader2 className="h-6 w-6 animate-spin" /></CardHeader>
                <CardContent><div className="h-10 bg-muted rounded"></div></CardContent>
            </Card>
        ))}
      </div>
    );
  }

  if (!summaryData) {
    return <p>Nenhum dado encontrado para o ano selecionado.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <GrossProfitCard 
            value={formatCurrency(summaryData.grossProfit)}
            margin={formatPercent(summaryData.grossMargin)}
        />
        <FinancialSummaryCard
            title="Receita Líquida"
            value={formatCurrency(summaryData.netRevenue)}
            icon={TrendingUp}
        />
        <FinancialSummaryCard
            title="Lucro Líquido"
            value={formatCurrency(summaryData.netProfit)}
            subtitle="Margem Líquida"
            subvalue={formatPercent(summaryData.netMargin)}
            icon={DollarSign}
        />
        <FinancialSummaryCard
            title="Despesas Totais"
            value={formatCurrency(summaryData.totalExpenses)}
            icon={TrendingDown}
        />
    </div>
  );
}
