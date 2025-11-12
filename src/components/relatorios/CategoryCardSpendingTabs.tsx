
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
import type { Expense, Card as CardType, HierarchicalTag } from '@/lib/types';
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
import { useTransactions } from '@/hooks/use-transactions';


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

function SpendingChart({ expenses, selectedPrincipalTagId, analysisType }: { expenses: Expense[], selectedPrincipalTagId: string | 'all', analysisType: 'principal' | 'secundaria' }) {
  const [chartData, setChartData] = useState<SpendingData[]>([]);
  const { hierarchicalTags } = useTags();

  useEffect(() => {
    const totals: { [key: string]: number } = {};
    let totalSpending = 0;

    if (analysisType === 'principal') {
        const tagToPrincipalMap: { [key: string]: string } = {};
        hierarchicalTags.forEach(pt => {
            pt.children.forEach(st => {
                tagToPrincipalMap[st.name] = pt.name;
            });
        });

        expenses.forEach(expense => {
            if (expense.tags && expense.tags.length > 0) {
                const uniquePrincipalTags = new Set<string>();
                expense.tags.forEach(tag => {
                    if (tagToPrincipalMap[tag]) {
                        uniquePrincipalTags.add(tagToPrincipalMap[tag]);
                    }
                });
                uniquePrincipalTags.forEach(principalTag => {
                    totals[principalTag] = (totals[principalTag] || 0) + expense.amount;
                });
            }
        });
        totalSpending = Object.values(totals).reduce((acc, val) => acc + val, 0);

    } else { // 'secundaria'
        const relevantSubTags = selectedPrincipalTagId === 'all'
            ? hierarchicalTags.flatMap(pt => pt.children.map(st => st.name))
            : hierarchicalTags.find(pt => pt.id === selectedPrincipalTagId)?.children.map(st => st.name) || [];

        const filteredExpenses = expenses.filter(expense => 
            expense.tags && expense.tags.some(tag => relevantSubTags.includes(tag))
        );

        totalSpending = filteredExpenses.reduce((acc, exp) => acc + exp.amount, 0);

        filteredExpenses.forEach((expense) => {
            if (expense.tags && expense.tags.length > 0) {
                expense.tags.forEach(tag => {
                    if (relevantSubTags.includes(tag)) {
                        totals[tag] = (totals[tag] || 0) + expense.amount;
                    }
                });
            }
        });
    }

    const data = Object.entries(totals)
      .map(([name, value]) => ({ name, value, percent: totalSpending > 0 ? (value / totalSpending) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);

    setChartData(data);
  }, [expenses, selectedPrincipalTagId, analysisType, hierarchicalTags]);

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

interface CategoryCardSpendingTabsProps {
  showCardSpending?: boolean;
  selectedMonth: number;
  selectedYear: number;
}


// --- Main Tabs Component ---
export default function CategoryCardSpendingTabs({ showCardSpending = true, selectedMonth, selectedYear }: CategoryCardSpendingTabsProps) {
  const { activeProfile } = useProfile();
  const { hierarchicalTags, loading: tagsLoading } = useTags();
  
  const [viewMode, setViewMode] = useState('mensal');
  const [analysisType, setAnalysisType] = useState<'principal' | 'secundaria'>('principal');
  const [selectedPrincipalTagId, setSelectedPrincipalTagId] = useState<string | 'all'>('all');
  
  const period = useMemo(() => (
    viewMode === 'mensal'
      ? { year: selectedYear, month: selectedMonth }
      : { year: selectedYear }
  ), [viewMode, selectedYear, selectedMonth]);

  const { expenses, loading } = useTransactions(activeProfile, period);

  const months = Object.values(text.dashboard.months);
  const periodLabel = useMemo(() => {
    return viewMode === 'mensal' ? `${months[selectedMonth]} de ${selectedYear}` : selectedYear;
  }, [selectedMonth, selectedYear, viewMode, months]);

  const activePrincipalTags = useMemo(() => {
    if (tagsLoading || expenses.length === 0) return [];
    
    const tagToPrincipalMap = new Map<string, HierarchicalTag>();
     hierarchicalTags.forEach(pt => {
        pt.children.forEach(st => {
            tagToPrincipalMap.set(st.name, pt);
        });
    });

    const activeIds = new Set<string>();
    expenses.forEach(expense => {
      if (expense.tags) {
        expense.tags.forEach(tag => {
          const principal = tagToPrincipalMap.get(tag);
          if (principal) {
            activeIds.add(principal.id);
          }
        });
      }
    });

    return hierarchicalTags.filter(pt => activeIds.has(pt.id));

  }, [expenses, hierarchicalTags, tagsLoading]);

  
  const TAG_TABS = [
     { value: 'principal', label: 'Tag Principal' },
     { value: 'secundaria', label: 'Tag Secundária' },
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
          <Tabs defaultValue="principal" value={analysisType} onValueChange={(v) => setAnalysisType(v as any)}>
            <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${TAG_TABS.length}, 1fr)` }}>
              {TAG_TABS.map(tab => (
                 <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
              ))}
            </TabsList>
             {(loading || tagsLoading) ? <Loader2 className="mx-auto my-12 h-8 w-8 animate-spin" /> : (
              TAG_TABS.map(tab => (
                 <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  {tab.value === 'secundaria' && (
                     <div className="mb-4">
                        <Select value={selectedPrincipalTagId} onValueChange={setSelectedPrincipalTagId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione uma Tag Principal" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Tags</SelectItem>
                                {activePrincipalTags.map(tag => (
                                    <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                  )}
                  <SpendingChart expenses={expenses} selectedPrincipalTagId={selectedPrincipalTagId} analysisType={tab.value as any} />
                </TabsContent>
              ))
             )}
          </Tabs>
      </CardContent>
    </Card>
  );
}
