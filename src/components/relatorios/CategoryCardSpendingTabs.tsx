'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { useTags } from '@/hooks/use-tags';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// --- Base Spending Chart Component ---
interface SpendingData {
  name: string;
  value: number;
  percent: number;
}

const CATEGORY_COLORS = [
  '#2563eb', '#f97316', '#22c55e', '#ef4444', '#8b5cf6',
  '#f59e0b', '#10b981', '#d946ef', '#0ea5e9', '#6d28d9',
  '#ec4899', '#f43f5e', '#84cc16', '#14b8a6', '#6366f1',
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

function SpendingChart({ expenses, selectedPrincipalTagId }: { expenses: Expense[], selectedPrincipalTagId: string | 'all' }) {
  const [chartData, setChartData] = useState<SpendingData[]>([]);
  const { hierarchicalTags } = useTags();

  const relevantSubTags = useMemo(() => {
    if (selectedPrincipalTagId === 'all') {
      // Pega todas as tags filhas de todas as tags principais
      return hierarchicalTags.flatMap(pt => pt.children.map(st => st.name));
    }
    const principalTag = hierarchicalTags.find(pt => pt.id === selectedPrincipalTagId);
    return principalTag ? principalTag.children.map(st => st.name) : [];
  }, [selectedPrincipalTagId, hierarchicalTags]);

  useEffect(() => {
    const totals: { [key: string]: number } = {};

    expenses.forEach((expense) => {
      if (expense.tags && expense.tags.length > 0) {
        expense.tags.forEach(tag => {
          if(relevantSubTags.includes(tag)) {
            totals[tag] = (totals[tag] || 0) + expense.amount;
          }
        });
      }
    });

    const totalSpending = Object.values(totals).reduce((acc, val) => acc + val, 0);

    const data = Object.entries(totals)
      .map(([name, value]) => ({ name, value, percent: totalSpending > 0 ? (value / totalSpending) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [expenses, relevantSubTags]);

  if (expenses.length === 0) {
    return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem gastos neste período.</div>;
  }
  
  if (chartData.length === 0) {
     return <div className="flex justify-center items-center h-64 text-muted-foreground">Sem gastos com tags neste período/filtro.</div>;
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
          wrapperStyle={{ overflowY: 'auto', maxHeight: 280 }}
          formatter={(value, entry) => {
            const { payload } = entry;
            const percent = (payload as any)?.percent || 0;
            return (
              <span className="text-muted-foreground text-xs">
                {value} ({formatCurrency(entry.payload?.value || 0)}) <span className="font-bold">{percent.toFixed(2)}%</span>
              </span>
            );
          }}
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
    <div className="space-y-4 p-4 max-h-[300px] overflow-y-auto">
      {cardSpending.map(({ card, total }) => {
        const percentage = card.limit > 0 ? (total / card.limit) * 100 : 0;
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
  selectedMonth: number;
  selectedYear: number;
}


// --- Main Tabs Component ---
export default function CategoryCardSpendingTabs({ showCardSpending = true, selectedMonth, selectedYear }: CategoryCardSpendingTabsProps) {
  const { user } = useAuth();
  const { activeProfile } = useProfile();
  const { hierarchicalTags, loading: tagsLoading } = useTags();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cards, setCards] = useState<CardType[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('mensal');
  const [selectedPrincipalTagId, setSelectedPrincipalTagId] = useState<string | 'all'>('all');

  const principalTags = useMemo(() => {
    return hierarchicalTags.filter(t => t.isPrincipal && t.children.length > 0);
  }, [hierarchicalTags]);


  const months = Object.values(text.dashboard.months);
  const periodLabel = useMemo(() => {
    return viewMode === 'mensal' ? `${months[selectedMonth]} de ${selectedYear}` : selectedYear;
  }, [selectedMonth, selectedYear, viewMode, months]);


  useEffect(() => {
    if (!user || !activeProfile) return;

    setLoading(true);
    setExpenses([]); 

    const startDate = viewMode === 'mensal'
      ? new Date(selectedYear, selectedMonth, 1)
      : new Date(selectedYear, 0, 1);
    const endDate = viewMode === 'mensal'
      ? new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59)
      : new Date(selectedYear, 11, 31, 23, 59, 59);

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

  }, [user, activeProfile, selectedYear, selectedMonth, showCardSpending, viewMode]);

  const TABS = [
    { value: "tags", label: "Tags", content: <SpendingChart expenses={expenses} selectedPrincipalTagId={selectedPrincipalTagId} /> },
    ...(showCardSpending ? [{ value: "cards", label: "Cartões", content: <CardSpendingList expenses={expenses} cards={cards} /> }] : [])
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-start gap-4">
          <div>
            <CardTitle>Análise de Gastos</CardTitle>
            <CardDescription>Veja seus gastos por tags e cartão.</CardDescription>
          </div>
          <div>
            <Tabs
              value={viewMode}
              onValueChange={setViewMode}
              className="w-auto"
            >
              <TabsList className="h-8">
                <TabsTrigger value="mensal" className="text-xs px-2 py-1">
                  {text.reports.monthly}
                </TabsTrigger>
                <TabsTrigger value="anual" className="text-xs px-2 py-1">
                  {text.reports.annual}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="text-xs text-muted-foreground text-center mt-1">
              ({periodLabel})
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
          <Tabs defaultValue="tags">
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
              {TABS.map(tab => (
                 <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
            <div className="mt-4">
                <Select value={selectedPrincipalTagId} onValueChange={setSelectedPrincipalTagId}>
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione uma Tag Principal" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todas as Tags Principais</SelectItem>
                        {principalTags.map(tag => (
                            <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
             {(loading || tagsLoading) ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : (
              TABS.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  {tab.content}
                </TabsContent>
              ))
             )}
          </Tabs>
      </CardContent>
    </Card>
  );
}
