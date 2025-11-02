'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/use-auth';
import { useProfile } from '@/hooks/use-profile';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { text } from '@/lib/strings';
import type { Expense, Card as CardType } from '@/lib/types';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import { Progress } from '../ui/progress';

const generateYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 5; i++) {
    years.push(currentYear - i);
  }
  return years;
};

const months = Object.entries(text.dashboard.months).map(
  ([key, label], index) => ({
    value: index,
    label: label,
  })
);

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// --- Category Spending Component ---
interface CategorySpendingData {
  name: string;
  value: number;
}

const CATEGORY_COLORS = [
  '#2563eb', '#f97316', '#22c55e', '#ef4444', '#8b5cf6',
  '#f59e0b', '#10b981', '#d946ef', '#0ea5e9', '#6d28d9',
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-background border border-border p-2 rounded-lg shadow-lg">
        <p className="font-bold">{`${data.name}: ${formatCurrency(data.value)}`}</p>
        <p className="text-sm text-muted-foreground">{`${data.percent.toFixed(2)}% do total`}</p>
      </div>
    );
  }
  return null;
};

function CategorySpendingChart({ expenses }: { expenses: Expense[] }) {
  const [chartData, setChartData] = useState<CategorySpendingData[]>([]);

  useEffect(() => {
    const categoryTotals: { [key: string]: number } = {};
    expenses.forEach((expense) => {
      categoryTotals[expense.mainCategory] = (categoryTotals[expense.mainCategory] || 0) + expense.amount;
    });

    const totalSpending = Object.values(categoryTotals).reduce((acc, val) => acc + val, 0);

    const data = Object.entries(categoryTotals)
      .map(([name, value]) => ({ name, value, percent: totalSpending > 0 ? (value / totalSpending) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [expenses]);

  if (expenses.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem gastos nesta categoria.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={80}
          innerRadius={60}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          iconSize={10}
          layout="vertical"
          verticalAlign="middle"
          align="right"
          formatter={(value, entry) => (
            <span className="text-muted-foreground text-xs">
              {value} ({formatCurrency(entry.payload?.value || 0)})
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

// --- Card Spending Component ---
interface CardSpendingData {
  card: CardType;
  total: number;
}

function CardSpendingList({ expenses, cards }: { expenses: Expense[], cards: CardType[] }) {

  const cardSpending = cards.map(card => {
    const total = expenses
      .filter(e => e.paymentMethod === `Cartão: ${card.name}`)
      .reduce((acc, e) => acc + e.amount, 0);
    return { card, total };
  }).filter(cs => cs.total > 0)
    .sort((a, b) => b.total - a.total);

  if (cardSpending.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem gastos com cartão neste período.</div>;
  }

  return (
    <div className="space-y-4 p-4">
      {cardSpending.map(({ card, total }) => {
        const percentage = (total / card.limit) * 100;
        return (
          <div key={card.id}>
            <div className="flex justify-between items-center mb-1">
              <span className="font-semibold text-sm">{card.name}</span>
              <span className="text-sm">{formatCurrency(total)} / <span className="text-xs text-muted-foreground">{formatCurrency(card.limit)}</span></span>
            </div>
            <Progress value={percentage} indicatorClassName="bg-primary" />
          </div>
        )
      })}
    </div>
  )
}

interface CategoryCardSpendingTabsProps {
  showCardSpending?: boolean;
}


// --- Main Tabs Component ---
export default function CategoryCardSpendingTabs({ showCardSpending = true }: CategoryCardSpendingTabsProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);

  const yearOptions = generateYearOptions();

  useEffect(() => {
    if (!user || !activeProfile) return;

    setLoading(true);

    const startDate = new Date(selectedYear, selectedMonth, 1);
    const endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);

    const expensesQuery = query(
      collection(db, 'expenses'),
      where('userId', '==', user.uid),
      where('profile', '==', activeProfile),
      where('date', '>=', Timestamp.fromDate(startDate)),
      where('date', '<=', Timestamp.fromDate(endDate))
    );

    const unsubExpenses = onSnapshot(expensesQuery, (snap) => {
      const fetchedExpenses = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
      setExpenses(fetchedExpenses);
      setLoading(false);
    }, () => setLoading(false));
    
    let unsubCards = () => {};
    if (showCardSpending) {
      const cardsQuery = query(
        collection(db, 'cards'),
        where('userId', '==', user.uid),
        where('profile', '==', activeProfile)
      );
      unsubCards = onSnapshot(cardsQuery, (snap) => {
        const fetchedCards = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CardType));
        setCards(fetchedCards);
      });
    }

    return () => {
      unsubExpenses();
      unsubCards();
    };

  }, [user, activeProfile, selectedYear, selectedMonth, showCardSpending]);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <CardTitle>Análise de Gastos</CardTitle>
            <CardDescription>Veja seus gastos por categoria e cartão.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
              <SelectTrigger className="w-36 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
              <SelectTrigger className="w-24 text-xs h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {showCardSpending ? (
          <Tabs defaultValue="categories">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="categories">Categorias</TabsTrigger>
              <TabsTrigger value="cards">Cartões</TabsTrigger>
            </TabsList>
            <TabsContent value="categories">
              {loading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : <CategorySpendingChart expenses={expenses} />}
            </TabsContent>
            <TabsContent value="cards">
              {loading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : <CardSpendingList expenses={expenses} cards={cards} />}
            </TabsContent>
          </Tabs>
        ) : (
          loading ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : <CategorySpendingChart expenses={expenses} />
        )}
      </CardContent>
    </Card>
  );
}
